const Xvfb = require('xvfb');
const { AmfModelGenerator } = require('./amf-model-generator.js');
const { prepareAmfBuild } = require('./amf-builder.js');
const { ComponentModel } = require('./models/component-model');
const { TestsModel } = require('./models/test-model');
const { TestsComponentModel } = require('./models/test-component-model');
const { DependencyModel } = require('./models/dependency-model');
const { TestsLogsModel } = require('./models/test-logs-model');
const logging = require('../lib/logging');
const { ComponentTestRunner } = require('./component-test-runner');
const { DependendenciesManager } = require('./dependencies-manager');
const path = require('path');
const { GitBuild } = require('./builds/git-build');
/**
 * A class responsible for running API comsponents tests in a worker.
 */
class ApicTestRunner extends GitBuild {
  constructor(id, testConfig) {
    super();
    this.entryId = id;
    this.config = testConfig;
    this.result = {};
    this.catalogModel = new ComponentModel();
    this.testsModel = new TestsModel();
    this.testsComponentModel = new TestsComponentModel();
    this.testsLogsModel = new TestsLogsModel();
    this.dependencyModel = new DependencyModel();
    this.abort = false;
    this.running = false;
    this.xvfb = new Xvfb();
  }

  get skipComponents() {
    return ['api-components-autotest', 'api-console-default-theme',
      'api-console-ext-comm', 'api-candidates-dialog', 'api-form-mixin',
      'api-property-form-item'];
  }

  get skipBottomUpComponents() {
    return ['api-components-autotest', 'api-console-default-theme'];
  }

  async run() {
    if (this.abort) {
      return Promise.resolve();
    }
    this.running = true;
    try {
      await this.testsModel.startTest(this.entryId);
      await this.createWorkingDir();
      await this._prepareTestType();
      setImmediate(() => this._next());
    } catch (e) {
      this.emit('status', 'error', e.message);
      return this.reportTestError(e);
    }
  }

  _prepareTestType() {
    switch (this.config.type) {
      case 'amf-build': return this._prepareAmfTest();
      case 'bottom-up': return this._prepareBottomUpTest();
      default:
        throw new Error('Unknown test type: ' + this.config.type);
    }
  }
  /**
   * Prepares test run for AMF tests.
   * This includes listing for all AMF powered components and build of
   * AMF version.
   * @return {Promise}
   */
  async _prepareAmfTest() {
    logging.verbose('Preparing AMF test...');
    const result = await this.catalogModel.listApiComponents();
    const skip = this.skipComponents;
    this.cmps = result.filter((item) => skip.indexOf(item) === -1);
    await this.testsModel.updateTestScope(this.entryId, this.cmps.length);
    this.emit('status', this.config.type, 'running');
    return await prepareAmfBuild(this.workingDir, this.config.branch, this.config.sha);
  }
  /**
   * Prepares test run for bottom-up tests.
   * Bottom up tests allows to test component that is a dependency of other components to check
   * whether a change to the version would break any component that depends on this component.
   *
   * This function lists a parent dependencies for the component.
   * @return {Promise}
   */
  async _prepareBottomUpTest() {
    logging.verbose('Preparing bottom-up test...');
    const data = await this.dependencyModel.listParentComponents(this.config.component, this.config.includeDev);
    const skip = this.skipBottomUpComponents;
    const result = [];
    for (let i = 0, len = data.length; i < len; i++) {
      const item = data[i].id;
      if (skip.indexOf(item) === -1) {
        result[result.length] = item;
      }
    }
    this.cmps = result;
    return await this.testsModel.updateTestScope(this.entryId, this.cmps.length);
  }

  async _next() {
    if (this.abort) {
      return;
    }
    const component = this.cmps.shift();
    if (!component) {
      this.finish();
      return;
    }
    logging.info('Executing test: ' + component);
    try {
      await this.testsComponentModel.create(this.entryId, component);
      await this.prepare(component);
      const result = await this.runTest(component);
      await this.reportComponentSuccess(component, result);
    } catch (e) {
      this.reportComponentError(component, e);
    }
    setImmediate(() => this._next());
  }

  prepare(name) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Preparing ${name} component to run in test`);
    return this._clone({
      branch: 'master',
      sshUrl: `git@github.com:advanced-rest-client/${name}.git`,
      componentDir: path.join(this.workingDir, name)
    })
    .catch((cause) => {
      logging.error('Unable to process component sources   ' + name);
      logging.error(cause.stack || cause.message);
      throw cause;
    })
    .then(() => {
      switch (this.config.type) {
        case 'amf-build': return this.updateModels(name);
      }
    })
    .then(() => {
      if (this.abort) {
        return;
      }
      const dm = new DependendenciesManager(path.join(this.workingDir, name));
      let extra;
      if (this.config.type === 'bottom-up') {
        extra = {
          component: this.config.component,
          branch: this.config.branch,
          commit: this.config.commit
        };
      }
      return dm.installDependencies(extra)
      .catch((cause) => {
        logging.error('Cannot Install dependencies for   ' + name);
        logging.error(cause.stack || cause.message);
        throw cause;
      });
    })
    .then(() => {
      if (this.abort) {
        return;
      }
      logging.verbose(`Component ${name} is ready`);
    });
  }

  updateModels(name) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose('Generating API models for ' + name);
    const updater = new AmfModelGenerator(this.workingDir, name);
    return updater.generate()
    .catch((cause) => {
      logging.error('Cannot generate AMF model for  ' + name);
      logging.error(cause.stack || cause.message);
      throw cause;
    })
    .then(() => {
      if (this.abort) {
        return;
      }
      logging.verbose('API model generated.');
    });
  }
  /**
   * Tries to run xvbt. It retries twice before giving up.
   * Usualy first attempt fails and whole test failes. This is to ensure that the test
   * won't fail because of that.
   * @return {Promise}
   */
  _ensureXvfb() {
    if (this._xvfbRunning) {
      return Promise.resolve();
    }
    let attempt = 0;
    return this.__startXvfb()
    .catch((cause) => {
      if (attempt < 3) {
        attempt++;
        return this._ensureXvfb();
      }
      throw cause;
    })
    .then(() => {
      this._xvfbRunning = true;
    });
  }

  __startXvfb() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.xvfb.start((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }, 500);
    });
  }

  _stopXvfb() {
    if (!this._xvfbRunning) {
      return;
    }
    this.xvfb.stopSync();
    this._xvfbRunning = false;
  }

  runTest(name) {
    if (this.abort) {
      return Promise.resolve();
    }
    return this._ensureXvfb()
    .then(() => {
      const runner = new ComponentTestRunner(name, this.workingDir);
      return runner.run();
    });
  }

  reportComponentSuccess(name, result) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Component ${name} finished with success.`);
    return this.testsComponentModel.updateComponent(this.entryId, name, result)
    .then(() => this.testsLogsModel.addLogs(this.entryId, name, result.results))
    .then(() => this.testsModel.updateComponentResult(this.entryId, result));
  }

  reportComponentError(component, err) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Component ${component} finished with error.`);
    logging.error(err.stack || err.message);
    if (err.message) {
      err = err.message;
    }
    if (!err) {
      err = 'Unknown error occurred';
    }
    return this.testsComponentModel.updateComponentError(this.entryId, component, err)
    .then(() => this.testsModel.setComponentError(this.entryId));
  }

  reportTestError(err) {
    this._stopXvfb();
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose('Test finished with error.');
    logging.error(err.stack || err.message);
    if (err.message) {
      err = err.message;
    }
    if (!err) {
      err = 'Unknown error occurred';
    }
    return this.testsModel.setTestError(this.entryId, err)
    .then(() => this.cleanup())
    .catch((cause) => {
      logging.error(cause.stack || cause.message);
    })
    .then(() => {
      this.running = false;
      this.emit('end');
      this.emit('status', 'error', err);
    });
  }

  finish(message) {
    this._stopXvfb();
    if (this.abort) {
      return Promise.resolve();
    }
    logging.info('The test finished.');
    let model;
    return this.testsModel.finishTest(this.entryId, message)
    .then(() => this.testsModel.getTest(this.entryId))
    .then((result) => {
      model = result;
      return this.cleanup();
    })
    .catch((cause) => {
      logging.error(cause.stack || cause.message);
    })
    .then(() => {
      this.running = false;
      this.emit('status', 'result', model);
      this.emit('end');
    });
  }
}

module.exports.ApicTestRunner = ApicTestRunner;
