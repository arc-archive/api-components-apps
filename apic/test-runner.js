const EventEmitter = require('events');
const {AmfModelGenerator} = require('./amf-model-generator.js');
const {prepareComponent} = require('./component-sources.js');
const {prepareAmfBuild} = require('./amf-builder.js');
const {CatalogModel} = require('./models/catalog-model');
const {TestsModel} = require('./models/test-model');
const {TestsComponentModel} = require('./models/test-component-model');
const {TestsLogsModel} = require('./models/test-logs-model');
const logging = require('../lib/logging');
const {ComponentTestRunner} = require('./component-test-runner');
const {DependendenciesManager} = require('./dependencies-manager');
const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');
/**
 * A class responsible for running API comsponents tests in a worker.
 */
class ApicTestRunner extends EventEmitter {
  constructor(id, testConfig) {
    super();
    this.entryId = id;
    this.config = testConfig;
    this.result = {};
    this.catalogModel = new CatalogModel();
    this.testsModel = new TestsModel();
    this.testsComponentModel = new TestsComponentModel();
    this.testsLogsModel = new TestsLogsModel();
    this.abort = false;
  }

  get skipComponents() {
    return ['api-components-autotest', 'api-console-default-theme', 'api-console-ext-comm'];
  }

  run() {
    if (this.abort) {
      return Promise.resolve();
    }
    return this.testsModel.startTest(this.entryId)
    .then(() => this.createWorkingDir())
    .then(() => this.catalogModel.listApiComponents())
    .then((result) => {
      const skip = this.skipComponents;
      this.cmps = result.filter((item) => skip.indexOf(item) === -1);
      return this.testsModel.updateTestScope(this.entryId, this.cmps.length);
    })
    .then(() => prepareAmfBuild(this.workingDir, this.config.branch, this.config.sha))
    .then(() => {
      setImmediate(() => this._next());
    })
    .catch((cause) => {
      return this.reportTestError(cause);
    });
  }

  /**
   * Creates a working directory where the files will be processed.
   *
   * @return {Promise} Resolved promise when the tmp dire was created
   * with path to the working
   * directory.
   */
  createWorkingDir() {
    return this.createTempDir()
    .then((path) => fs.realpath(path))
    .then((dir) => {
      logging.verbose('Created working directory ' + dir);
      this.workingDir = dir;
    });
  }
  /**
   * Cleans up the temporaty directory.
   * @return {Promise}
   */
  cleanup() {
    if (!this.workingDir) {
      return Promise.resolve();
    }
    logging.debug('Cleaning up temporaty dir...');
    return fs.pathExists(this.workingDir)
    .then((exists) => {
      if (exists) {
        logging.debug('Removing ' + this.workingDir);
        return fs.remove(this.workingDir);
      }
    });
  }
  /**
   * Creates a temp working dir for the console.
   * @return {Promise}
   */
  createTempDir() {
    logging.debug('Creating working directory...');
    return new Promise((resolve, reject) => {
      tmp.dir((err, _path) => {
        if (err) {
          reject(new Error('Unable to create a temp dir: ' + err.message));
          return;
        }
        resolve(_path);
      });
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
    return prepareComponent(this.workingDir, name)
    .catch((cause) => {
      logging.error('Unable to process component sources   ' + name);
      logging.error(cause);
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
        logging.error(cause);
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
      logging.error(cause);
      throw cause;
    })
    .then(() => {
      if (this.abort) {
        return;
      }
      logging.verbose('API model generated.');
    });
  }

  runTest(name) {
    if (this.abort) {
      return Promise.resolve();
    }
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
    logging.error(err);
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
    if (this.abort) {
      return Promise.resolve();
    }
    logging.verbose('Test finished with error.');
    logging.error(err);
    if (err.message) {
      err = err.message;
    }
    if (!err) {
      err = 'Unknown error occurred';
    }
    return this.testsModel.setTestError(this.entryId, err)
    .then(() => this.cleanup())
    .catch((cause) => {
      logging.error(cause);
    })
    .then(() => this.emit('end'));
  }

  finish(message) {
    if (this.abort) {
      return Promise.resolve();
    }
    logging.info('The test finished.');
    return this.testsModel.finishTest(this.entryId, message)
    .then(() => this.cleanup())
    .catch((cause) => {
      logging.error(cause);
    })
    .then(() => this.emit('end'));
  }
}

module.exports.ApicTestRunner = ApicTestRunner;
