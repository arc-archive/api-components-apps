const Xvfb = require('xvfb');
const {AmfModelGenerator} = require('./amf-model-generator.js');
const {prepareAmfBuild} = require('./amf-builder.js');
const {ComponentModel} = require('./models/component-model');
const {TestsModel} = require('./models/test-model');
const {TestsComponentModel} = require('./models/test-component-model');
const {TestsLogsModel} = require('./models/test-logs-model');
const logging = require('../lib/logging');
const {ComponentTestRunner} = require('./component-test-runner');
const {DependendenciesManager} = require('./dependencies-manager');
const path = require('path');
const {GitBuild} = require('./builds/git-build');
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
    this.abort = false;
    this.running = false;
    this.xvfb = new Xvfb();
  }

  get skipComponents() {
    return ['api-components-autotest', 'api-console-default-theme',
      'api-console-ext-comm', 'api-candidates-dialog', 'api-form-mixin',
      'api-property-form-item'];
  }

  run() {
    if (this.abort) {
      return Promise.resolve();
    }
    this.running = true;
    return this.testsModel.startTest(this.entryId)
    .then(() => this.createWorkingDir())
    .then(() => this.catalogModel.listApiComponents())
    .then((result) => {
      const skip = this.skipComponents;
      this.cmps = result.filter((item) => skip.indexOf(item) === -1);
      return this.testsModel.updateTestScope(this.entryId, this.cmps.length);
    })
    .then(() => {
      this.emit('status', 'amf-build', 'running');
    })
    .then(() => prepareAmfBuild(this.workingDir, this.config.branch, this.config.sha))
    .then(() => {
      this.emit('status', 'amf-build', 'finished');
      setImmediate(() => this._next());
    })
    .catch((cause) => {
      this.emit('status', 'error', cause.message);
      return this.reportTestError(cause);
    });
  }

  _next() {
    if (this.abort) {
      return;
    }
    const component = this.cmps.shift();
    if (!component) {
      this.finish();
      return;
    }
    logging.info('Executing test: ' + component);
    return Promise.resolve()
    .then(() => {
      return this.testsComponentModel.create(this.entryId, component);
    })
    .then(() => this.prepare(component))
    .then(() => this.runTest(component))
    .then((result) => this.reportComponentSuccess(component, result))
    .catch((cause) => this.reportComponentError(component, cause))
    .then(() => {
      setImmediate(() => this._next());
    });
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
    .then(() => this.updateModels(name))
    .then(() => {
      if (this.abort) {
        return;
      }
      const dm = new DependendenciesManager(path.join(this.workingDir, name));
      return dm.installDependencies()
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

  _ensureXvfb() {
    if (this._xvfbRunning) {
      return;
    }
    this.xvfb.startSync();
    this._xvfbRunning = true;
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
    this._ensureXvfb();
    const runner = new ComponentTestRunner(name, this.workingDir);
    return runner.run();
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
