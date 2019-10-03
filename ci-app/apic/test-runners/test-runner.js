const { prepareAmfBuild } = require('./amf-builder.js');
const { ComponentModel } = require('../models/component-model');
const { TestsModel } = require('../models/test-model');
const { TestsComponentModel } = require('../models/test-component-model');
const { DependencyModel } = require('../models/dependency-model');
const { TestsLogsModel } = require('../models/test-logs-model');
const logging = require('../../lib/logging');
const { KarmaTestRunner } = require('./karma-test-runner');
const { GitBuild } = require('../builds/git-build');
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
  }

  get skipComponents() {
    return [
      'api-components-autotest',
      'api-console-default-theme',
      '@api-components/api-console-ext-comm',
      '@api-components/api-candidates-dialog',
      '@api-components/api-form-mixin',
      '@api-components/api-property-form-item'
    ];
  }

  get skipBottomUpComponents() {
    return ['api-components-apps', 'api-console-default-theme'];
  }

  async run() {
    if (this.abort) {
      return;
    }
    this.running = true;
    try {
      await this.testsModel.startTest(this.entryId);
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
    await this.createWorkingDir();
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
    const thisCmp = this.config.component.split('/');
    if (thisCmp[0][0] === '@') {
      thisCmp[0] = thisCmp[0].substr(1);
    }
    const result = [{
      org: thisCmp[0],
      name: thisCmp[1]
    }];
    for (let i = 0, len = data.length; i < len; i++) {
      const item = data[i].id;
      if (skip.indexOf(item) === -1) {
        const parts = item.split('/');
        if (parts.length === 0) {
          parts.unshift('advanced-rest-client');
        }
        if (parts[0][0] === '@') {
          parts[0] = parts[0].substr(1);
        }
        result[result.length] = {
          org: parts[0],
          name: parts[1]
        };
      }
    }
    this.cmps = result;
    logging.verbose('Updating test scope...');
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
    const fullName = component.fullName = component.org + '/' + component.name;
    logging.info('Executing test: @' + fullName);
    try {
      await this.testsComponentModel.create(this.entryId, fullName);
      const result = await this.runTest(component);
      await this.reportComponentSuccess(fullName, result);
    } catch (e) {
      this.reportComponentError(fullName, e);
    }
    setImmediate(() => this._next());
  }

  async runTest(component) {
    if (this.abort) {
      return;
    }
    const runner = new KarmaTestRunner(component.org, component.name, this.config);
    if (this.workingDir) {
      runner.workingDir = this.workingDir;
    }
    return await runner.run();
  }

  async reportComponentSuccess(name, result) {
    if (this.abort) {
      return;
    }
    logging.info(`Component ${name} finished with success.`);
    await this.testsComponentModel.updateComponent(this.entryId, name, result);
    await this.testsLogsModel.addLogs(this.entryId, name, result.results);
    await this.testsModel.updateComponentResult(this.entryId, result);
  }

  async reportComponentError(component, err) {
    if (this.abort) {
      return;
    }
    logging.info(`Component ${component} finished with error.`);
    logging.error(err.stack || err.message);
    if (err.message) {
      err = err.message;
    }
    if (!err) {
      err = 'Unknown error occurred';
    }
    await this.testsComponentModel.updateComponentError(this.entryId, component, err);
    await this.testsModel.setComponentError(this.entryId);
  }

  async reportTestError(err) {
    if (this.abort) {
      return;
    }
    logging.info('Test finished with error.');
    logging.error(err.stack || err.message);
    if (err.message) {
      err = err.message;
    }
    if (!err) {
      err = 'Unknown error occurred';
    }
    try {
      await this.testsModel.setTestError(this.entryId, err);
      await this.cleanup();
    } catch (cause) {
      logging.error(cause.stack || cause.message);
    }
    this.running = false;
    this.emit('end');
    this.emit('status', 'error', err);
  }

  async finish(message) {
    if (this.abort) {
      return;
    }
    logging.info('The test finished.', message);
    let model;
    try {
      await this.testsModel.finishTest(this.entryId, message);
      model = await this.testsModel.getTest(this.entryId);
      await this.cleanup();
    } catch (cause) {
      logging.error(cause.stack || cause.message);
    }
    this.running = false;
    this.emit('status', 'result', model);
    this.emit('end');
  }
}

module.exports.ApicTestRunner = ApicTestRunner;
