const path = require('path');
const { GitBuild } = require('../builds/git-build');
const { AmfModelGenerator } = require('../amf-model-generator.js');
const { DependendenciesManager } = require('../dependencies-manager');
const logging = require('../../lib/logging');

class BaseTestRunner extends GitBuild {
  constructor(org, component, config) {
    super();
    this.org = org;
    this.component = component;
    this.repoName = `${org}/${component}`;
    this.testConfig = config;

    this.results = {};
    this.passing = undefined;
    this.retry = 0;
  }
  /**
   * 1. Create tmp dir
   * 2. Clone repo
   * 3. Install dependencies
   * 4. Create AMF models (AMF build)
   * 5. Run test via `_run()` (child method)
   * 5. Create report.
   * @return {Promise}
   */
  async run() {
    await this.createWorkingDir();
    this.componentDir = path.join(this.workingDir, this.component);
    await this._prepareComponent();
    const result = await this._run();
    try {
      await this.cleanup();
    } catch (_) {}
    return result;
  }
  /**
   * 1. Clone repo
   * 2. Create AMF model (AMF build)
   * 3. Install dependencies
   * @return {Promise}
   */
  async _prepareComponent() {
    const { component } = this;
    logging.verbose(`Preparing ${component} component to run in test`);
    await this._prepareClone(component);
    if (this.testConfig.type === 'amf-build') {
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
        sshUrl: `git@github.com:${this.repoName}.git`,
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
    if (this.testConfig.type === 'bottom-up') {
      extra = {
        component: this.testConfig.component,
        branch: this.testConfig.branch
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
}
module.exports.BaseTestRunner = BaseTestRunner;
