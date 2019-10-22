import logging from '../lib/logging';
import { GitBuild } from './git-build';
import { CatalogDataGenerator } from './catalog-data-generator';
import { DependencyGraph } from './dependency-graph';
/**
 * A class responsible for processing the component after tag is created.
 */
export class TagBuild extends GitBuild {
  constructor(info) {
    super();
    this.info = info;
    const [scope, name] = this.getScopeAndName(info.component);
    this.cmpName = name;
    this.cmpScope = scope;
    this.cmpOrg = info.org;
  }

  getScopeAndName(fullName) {
    let [scope, name] = fullName.split('/');
    if (!name) {
      name = scope;
      scope = 'advanced-rest-client';
    }
    if (scope[0] === '@') {
      scope = scope.substr(1);
    }
    return [scope, name];
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
    if (this.nonElements.indexOf(this.cmpName) !== -1) {
      return;
    }
    try {
      await this.createWorkingDir();
      await this._clone();
      await this._generateCatalogModel();
      await this._generateGrpah();
      await this.cleanup();
      logging.info('Tag build completed.');
    } catch (cause) {
      logging.error('Tag build error: ' + cause.message);
    }
  }

  async _generateCatalogModel() {
    const generator = new CatalogDataGenerator(
      this.workingDir,
      this.cmpOrg,
      this.cmpName,
      this.info.branch);
    return await generator.build();
  }

  async _generateGrpah() {
    const generator = new DependencyGraph(
      this.workingDir,
      this.cmpOrg,
      this.cmpName
    );
    try {
      return await generator.buildGraph();
    } catch (cause) {
      logging.error('Graph build error: ' + cause.message);
    }
  }
}
