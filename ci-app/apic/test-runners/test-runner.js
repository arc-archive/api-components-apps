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
 *
 * This class:
 * - manages temp working directory
 * - lists components to test
 * - clones repository to a tmp folder and manages branch selection
 * - updates components state in the datastore
 * - determines test type (wct/karma) and runs test in an appropieate runner.
 * - cleans up after the test run.
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
    return [
      'api-components-autotest',
      'api-console-default-theme',
      'api-console-ext-comm',
      'api-candidates-dialog',
      'api-form-mixin',
      'api-property-form-item'
    ];
  }

  get skipBottomUpComponents() {
    return ['api-components-apps', 'api-console-default-theme'];
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
      case 'amf-build':
        return this._prepareAmfTest();
      case 'bottom-up':
        return this._prepareBottomUpTest();
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
  /**
   * Prepares a component for tests.
   * @param {String} component Component name
   * @return {Promise}
   */
  async prepare(component) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Preparing ${component} component to run in test`);
    await this._prepareClone(component);
    if (this.config.type === 'amf-build') {
      await this.updateModels(component);
    }
    await this._prepareDependencies(component);
    logging.verbose(`Component ${component} is ready`);
  }
  /**
   * Clones a component into a working directory
   * @param {String} component Component to clone
   * @return {Promise}
   */
  async _prepareClone(component) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Cloning ${component} component into ${this.workingDir}`);
    try {
      await this._clone({
        branch: 'master',
        sshUrl: `git@github.com:advanced-rest-client/${name}.git`,
        componentDir: path.join(this.workingDir, component)
      });
    } catch (e) {
      logging.error(`Unable to process component sources ${component}`);
      logging.error(e.stack || e.message);
      throw e;
    }
  }
  /**
   * Installs dependnecies of a component.
   * @param {String} component Component name
   * @return {Promise}
   */
  async _prepareDependencies(component) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Installing dependencies for ${component}`);
    const dm = new DependendenciesManager(path.join(this.workingDir, component));
    let extra;
    if (this.config.type === 'bottom-up') {
      extra = {
        component: this.config.component,
        branch: this.config.branch,
        commit: this.config.commit
      };
    }
    try {
      await dm.installDependencies(extra);
    } catch (cause) {
      logging.error(`Cannot Install dependencies for ${component}`);
      logging.error(cause.stack || cause.message);
      throw cause;
    }
  }
  /**
   * Generates AMF model for AMF type test.
   *
   * @param {String} component Component name
   * @return {Promise}
   */
  async updateModels(component) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Generating API models for ${component}`);
    const updater = new AmfModelGenerator(this.workingDir, component);
    try {
      await updater.generate();
    } catch (cause) {
      logging.error(`Cannot generate AMF model for ${component}`);
      logging.error(cause.stack || cause.message);
      throw cause;
    }
    logging.verbose('API model generated.');
  }
  /**
   * Tries to run xvbt. It retries twice before giving up.
   * Usualy first attempt fails and whole test failes. This is to ensure that the test
   * won't fail because of that.
   * @return {Promise}
   */
  async _ensureXvfb() {
    if (this._xvfbRunning) {
      return Promise.resolve();
    }
    try {
      await this.__startXvfb();
    } catch (cause) {
      if (this.__xvfbCounter < 3) {
        this.__xvfbCounter++;
        await this._ensureXvfb();
      }
      throw cause;
    }
    this._xvfbRunning = true;
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
    this.__xvfbCounter = 0;
    return this._ensureXvfb().then(() => {
      const runner = new ComponentTestRunner(name, this.workingDir);
      return runner.run();
    });
  }

  reportComponentSuccess(name, result) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose(`Component ${name} finished with success.`);
    return this.testsComponentModel
      .updateComponent(this.entryId, name, result)
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
    return this.testsComponentModel
      .updateComponentError(this.entryId, component, err)
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
    return this.testsModel
      .setTestError(this.entryId, err)
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
    return this.testsModel
      .finishTest(this.entryId, message)
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
