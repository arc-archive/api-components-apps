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

  readProjectDependencies() {
    const file = path.join(this.workingDir, 'bower.json');
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
      logging.warn('bower.json file do not exists. Skipping.');
    });
  }

  filterDependencies(deps) {
    const values = Object.values(deps);
    const result = [];
    for (let i = 0; i < values.length; i++) {
      let dependency = values[i];
      const index = dependency.indexOf('advanced-rest-client/');
      if (index === -1) {
        continue;
      }
      dependency = dependency.substr(21);
      const hash = dependency.indexOf('#');
      if (hash !== -1) {
        dependency = dependency.substr(0, hash);
      }
      result[result.length] = dependency;
    }
    return result.length ? result : undefined;
  }

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
