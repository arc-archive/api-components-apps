const fs = require('fs-extra');
const path = require('path');
const logging = require('../../lib/logging');
const {DependencyModel} = require('../models/dependency-model');
class DependencyGraph {
  /**
   * @constructor
   *
   * @param {String} workingDir Component location.
   * @param {String} component Component name from ARC organization.
   */
  constructor(workingDir, component) {
    this.component = component;
    this.workingDir = workingDir;
    this.model = new DependencyModel();
  }

  buildGraph() {
    logging.verbose('Building dependency graph...');
    return this.readProjectDependencies()
    .then((data) => {
      if (data && (data[0] || data[1])) {
        return this.processDepenedencies(data);
      }
    })
    .then(() => {
      logging.verbose('Dependency graph ready.');
    })
    .catch((cause) => {
      logging.error(cause.message);
      throw cause;
    });
  }
  /**
   * Reads dependencies from bower/package file.
   * @return {Array} First item is a map of dependencies and second item is a
   * map of dev dependencies. Both can be undefined.
   */
  readProjectDependencies() {
    return this._readDependencies('bower.json')
    .then((result) => {
      if (!result) {
        return this._readDependencies('package.json');
      }
      return result;
    });
  }

  _readDependencies(fileName) {
    const file = path.join(this.workingDir, fileName);
    return fs.readJson(file)
    .then((data) => {
      let deps;
      if (data.dependencies && Object.keys(data.dependencies).length) {
        deps = data.dependencies;
      }
      let devDeps;
      if (data.devDependencies && Object.keys(data.devDependencies).length) {
        devDeps = data.devDependencies;
      }
      return [deps, devDeps];
    })
    .catch(() => {
      logging.warn(fileName + ' file do not exists. Skipping.');
    });
  }
  /**
   * Filters out all non ARC/API components.
   * @param {Object} deps Bower/Npm dependencies map
   * @return {Array<String>} List of ARC/API components dependencies
   */
  filterDependencies(deps) {
    const result = [];
    for (let [key, value] of Object.entries(deps)) {
      if (key.indexOf('@advanced-rest-client') === 0 || key.indexOf('@api-components') === 0) {
        result[result.length] = key;
        continue;
      }
      let index = value.indexOf('advanced-rest-client/');
      if (index === -1) {
        continue;
      }
      value = value.substr(21);
      const hash = value.indexOf('#');
      if (hash !== -1) {
        value = value.substr(0, hash);
      }
      result[result.length] = value;
    }
    return result.length ? result : undefined;
  }
  /**
   * Filters and stores dependendies graph data.
   * @param {Array} data List of dependencies returned by `readProjectDependencies()`
   * @return {Promise}
   */
  processDepenedencies(data) {
    let deps;
    let devDeps;
    if (data[0]) {
      deps = this.filterDependencies(data[0]);
    }
    if (data[1]) {
      devDeps = this.filterDependencies(data[1]);
    }
    return this.model.set(this.component, deps, devDeps);
  }
}
module.exports.DependencyGraph = DependencyGraph;
