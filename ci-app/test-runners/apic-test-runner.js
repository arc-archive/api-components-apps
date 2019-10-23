import { BaseBuild } from '../builds/base-build.js';
import { KarmaTestRunner } from './karma-test-runner';
import { ComponentModel } from '../models/component-model';
import { TestsModel } from '../models/test-model';
import { TestsComponentModel } from '../models/test-component-model';
import { DependencyModel } from '../models/dependency-model';
import { TestsLogsModel } from '../models/test-logs-model';
import { prepareAmfBuild } from './amf-builder.js';
import logging from '../lib/logging';
/**
 * A class responsible for running API comsponents tests.
 */
export class ApicTestRunner extends BaseBuild {
  /**
   * @param {String} id The data store entry ID for the test
   * @param {Object} testConfig Datastore entry - a test configuration:
   * - type - `String`, test type: `amf-build` or `bottom-up`
   * - branch - `String`, name of the branch to use when cloning a component
   * - created - Number, timestamp of when the DB entry was created
   * - status - Current execution status. For new entrues (no re-run) it is always
   * `queued`
   * - `commit` This seems not to be used anywhere (?)
   * - component - String, fill npm name of the component (@advanced-rest-client/cmp-name)
   * - includeDev - Boolean, for bottom-up tests - includes dev depndencies when
   * creating list of tests to run.
   */
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

  get amfSkipComponents() {
    return [
      'api-components-apps',
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
    this.running = true;
    try {
      const { type, component, includeDev } = this.config;
      await this.testsModel.startTest(this.entryId);
      this.workingDir = await this.createWorkingDir();
      this.components = await this._listComponents(type, component, includeDev);
      const size = this.components.length;
      logging.verbose(`Found ${size} components to test.`);
      await this.testsModel.updateTestScope(this.entryId, size);
      if (type === 'amf-build') {
        await prepareAmfBuild(this.workingDir, this.config.branch, this.config.sha);
      }
      this.emit('status', this.config.type, 'running');
      // removes test executorion from current try / catch context
      setImmediate(() => this._next());
    } catch (e) {
      this.emit('status', 'error', e.message);
      await this.reportTestError(e);
    }
  }
  /**
   * Lists components that the test will be executed for.
   * @param {String} type Current test type.
   * @param {String} component Full NPM name of the component
   * @param {Boolean} includeDev
   * @return {Promise}
   */
  async _listComponents(type, component, includeDev) {
    let data;
    let skip;
    if (type === 'amf-build') {
      skip = this.amfSkipComponents;
      data = await this.catalogModel.listApiComponents();
    } else if (type === 'bottom-up') {
      skip = this.skipBottomUpComponents;
      data = await this.dependencyModel.listParentComponents(component, includeDev);
    } else {
      return [];
    }
    const result = [];
    for (let i = 0, len = data.length; i < len; i++) {
      const item = data[i];
      const { id, org, pkg } = item;
      if (skip.indexOf(id) !== -1) {
        continue;
      }
      if (!org || !pkg) {
        continue;
      }
      const dependency = {
        name: id,
        org,
        pkg
      };
      result[result.length] = dependency;
    }
    return result;
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

  async _next() {
    if (this.abort) {
      return;
    }
    const component = this.components.shift();
    if (!component) {
      this.finish();
      return;
    }
    const { pkg } = component;
    logging.info(`Executing test: ${pkg}`);
    try {
      await this.testsComponentModel.create(this.entryId, pkg);
      const result = await this.runTest(component);
      await this.reportComponentSuccess(pkg, result);
    } catch (e) {
      this.reportComponentError(pkg, e);
    }
    setImmediate(() => this._next());
  }

  async runTest(component) {
    if (this.abort) {
      return;
    }
    const runner = new KarmaTestRunner(component.org, component.name, component.pkg, this.config);
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
