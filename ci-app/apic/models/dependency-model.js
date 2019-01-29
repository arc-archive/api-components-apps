const {BaseModel} = require('./base-model');
/**
 * A model for catalog items.
 */
class DependencyModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  _createKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.dependencyKind,
        this.slug(name)
      ]
    });
  }

  set(component, dependencies, devDependencies) {
    const key = this._createKey(component);
    const results = [];
    if (dependencies) {
      results[results.length] = {
        name: 'dependencies',
        value: dependencies
      };
    }
    if (devDependencies) {
      results[results.length] = {
        name: 'devDependencies',
        value: devDependencies
      };
    }
    const entity = {
      key,
      data: results
    };
    return this.store.upsert(entity);
  }

  listParentComponents(dependency, includeDev) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('dependencies', '=', dependency)
    .select('__key__');
    return this.store.runQuery(query)
    .then((result) => {
      let deps = result[0].map((item) => {
        item = this.fromDatastore(item);
        item.production = true;
        return item;
      });
      let p;
      if (includeDev) {
        p = this.listDevParentComponents(dependency);
      } else {
        p = Promise.resolve();
      }
      return p.then((result) => {
        if (result) {
          deps = deps.concat(result);
        }
        return deps;
      });
    });
  }

  listDevParentComponents(dependency) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('devdependencies', '=', dependency)
    .select('__key__');
    return this.store.runQuery(query)
    .then((result) => {
      return result[0].map((item) => {
        item = this.fromDatastore(item);
        item.development = true;
        return item;
      });
    });
  }

  get(component) {
    const key = this._createKey(component);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
}

module.exports.DependencyModel = DependencyModel;
