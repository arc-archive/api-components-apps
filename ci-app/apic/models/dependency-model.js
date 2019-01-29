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

  set(component, depenednecies, devDependencies) {
    const key = this._createKey(component);
    const results = [];
    if (depenednecies) {
      results[results.length] = {
        name: 'depenednecies',
        value: depenednecies
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

  listParentComponents(dependency) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('depenednecies', '=', dependency)
    .select('__key__');
    return this.store.runQuery(query)
    .then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
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
