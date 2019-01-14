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
    this.workingDir = '/opt/apic-test/builds';
    this.catalogModel = new CatalogModel();
    this.testsModel = new TestsModel();
    this.testsComponentModel = new TestsComponentModel();
    this.testsLogsModel = new TestsLogsModel();
  }

  run() {
    // this.cmps = ['api-body-editor'];
    // this._next();
    // this.workingDir = '/opt/apic-test/builds';
    return this.createWorkingDir()
    .then(() => this.catalogModel.listApiComponents())
    .then((result) => {
      this.cmps = result;
      return this.testsModel.updateTestScope(this.entryId, result.length);
    })
    .then(() => prepareAmfBuild(this.workingDir, this.config.branch, this.config.sha))
    .then(() => this._next());
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
      .then((result) => this.reportSuccess(component, result))
      .catch((cause) => this.reportError(component, cause))
      .then(() => {
        setImmediate(() => this._next());
      });
  }

  prepare(name) {
    // return Promise.resolve();
    logging.verbose(`Preparing ${name} component to run in test`);
    return prepareComponent(this.workingDir, name)
    .then(() => this.updateModels(name))
    .then(() => {
      const dm = new DependendenciesManager(path.join(this.workingDir, name));
      return dm.installDependencies();
    })
    .then(() => {
      logging.verbose(`Component ${name} is ready`);
    });
  }

  updateModels(name) {
    logging.verbose('Generating API models for ' + name);
    const updater = new AmfModelGenerator(this.workingDir, name);
    return updater.generate()
    .then(() => {
      logging.verbose('API model generated.');
    });
  }

  runTest(name) {
    const runner = new ComponentTestRunner(name, this.workingDir);
    return runner.run();
  }

  reportSuccess(name, result) {
    logging.verbose(`Component ${name} finished with success.`);
    return this.testsComponentModel.updateComponent(this.entryId, name, result)
    .then(() => this.testsLogsModel.addLogs(this.entryId, name, result.results))
    .then(() => this.testsModel.updateComponentResult(this.entryId, result));
  }

  reportError(component, err) {
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

  finish() {
    logging.info('The test finished.');
    return this.testsModel.finishTest(this.entryId)
    .then(() => this.cleanup())
    .catch((cause) => {
      logging.error(cause);
    })
    .then(() => this.emit('end'));
  }
}

module.exports.ApicTestRunner = ApicTestRunner;
