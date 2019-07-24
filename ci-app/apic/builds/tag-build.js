const logging = require('../../lib/logging');
const { GitBuild } = require('./git-build');
const { CatalogDataGenerator } = require('./catalog-data-generator');
const { DependencyGraph } = require('./dependency-graph');
/**
 * A class responsible for processing the component after tag is created.
 */
class TagBuild extends GitBuild {
  constructor(info) {
    super();
    this.info = info;
    this.cmpName = this.getName(info.component);
  }

  getName(name) {
    const index = name.indexOf('/');
    if (index !== -1) {
      name = this.info.component.substr(index + 1);
    }
    return name;
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

  build() {
    if (this.nonElements.indexOf(this.cmpName) !== -1) {
      return Promise.resolve();
    }
    return this.createWorkingDir()
      .then(() => this._clone())
      .then(() => this._generateCatalogModel())
      .then(() => this._generateGrpah())
      .then(() => this.cleanup())
      .then(() => {
        logging.info('Tag build completed.');
      })
      .catch((cause) => {
        console.error(cause);
        logging.error('Tag build error: ' + cause.message);
        throw cause;
      });
  }

  _generateCatalogModel() {
    const generator = new CatalogDataGenerator(this.workingDir, this.cmpName, this.info.branch);
    return generator.build();
  }

  _generateGrpah() {
    const generator = new DependencyGraph(this.workingDir, this.cmpName);
    return generator.buildGraph().catch(() => {});
  }
}
module.exports.TagBuild = TagBuild;
