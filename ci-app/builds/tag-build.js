import logging from '../lib/logging';
import { BaseBuild } from './base-build.js';
import { CatalogDataGenerator } from './catalog-data-generator';
import { DependencyGraph } from './dependency-graph';
import { GitSourceControl } from '../github/git-source-control.js';
import { getScopeAndName } from './utils.js';
import { NpmPublish } from './npm-publish.js';
/**
 * A class responsible for processing the component after tag is created.
 */
export class TagBuild extends BaseBuild {
  constructor(info) {
    super();
    this.info = info;
    const { component, org, branch } = info;
    const [scope, name] = getScopeAndName(component);
    this.name = name;
    this.scope = scope;
    this.organization = org;
    this.tag = branch;
  }
  /**
   * Scopes of the selected packages are allowed to be published on npm.
   * @return {Array<String>} List of allowed scopes
   */
  get allowedScopes() {
    return [
      'api-components',
      'advanced-rest-client',
      'anypoint-web-components',
    ];
  }
  /**
   * List of know not arc component projects.
   *
   * @deprecated
   * @return {Array}
   */
  get nonElements() {
    return [
      'arc-datastore',
      'arc-tools',
      'polymd',
      'cookie-parser',
      'har',
      'arc-element-catalog',
      'ci-server',
      'arc-electron'
    ];
  }

  async build() {
    if (this.nonElements.indexOf(this.name) !== -1) {
      return;
    }
    try {
      this.workingDir = await this.createWorkingDir();
      await this._clone();
      await this._generateCatalogModel();
      await this._generateGrpah();
      await this._npmPublish();
      await this.cleanup();
      logging.info('Tag build completed.');
    } catch (cause) {
      logging.error('Tag build error: ' + cause.message);
    }
  }

  async _clone() {
    const github = new GitSourceControl(this.workingDir, this.organization, this.name);
    await github.clone(false);
  }

  async _generateCatalogModel() {
    const generator = new CatalogDataGenerator(
        this.workingDir,
        this.organization,
        this.name,
        this.info.branch);
    return await generator.build();
  }

  async _generateGrpah() {
    const generator = new DependencyGraph(
        this.workingDir,
        this.organization,
        this.name
    );
    try {
      return await generator.buildGraph();
    } catch (cause) {
      logging.error('Graph build error: ' + cause.message);
    }
  }

  async _npmPublish() {
    if (this.allowedScopes.indexOf(this.scope) === -1) {
      return;
    }
    const publisher = new NpmPublish(this.workingDir, this.tag);
    await publisher.publish();
  }
}
