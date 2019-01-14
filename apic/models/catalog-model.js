const Datastore = require('@google-cloud/datastore');
const config = require('../../config');
/**
 * A model for catalog items.
 */
class CatalogModel {
  /**
   * @constructor
   */
  constructor() {
    this.namespace = 'api-components';
    this.componentsKind = 'Component';
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace
    });
  }

  fromDatastore(obj) {
    obj.id = obj[this.store.KEY].name;
    return obj;
  }

  listComponents() {
    const query = this.store.createQuery(this.namespace, this.componentsKind);
    return this.store.runQuery(query)
    .then((result) => {
      return result[0];
    });
  }

  listApiComponents() {
    return this.listComponents()
    .then((components) => {
      const result = [];
      if (!components) {
        return result;
      }
      for (let i = 0, len = components.length; i < len; i++) {
        const name = components[i].name;
        if (!name || name.indexOf('api') !== 0) {
          continue;
        }
        result[result.length] = name;
      }
      return result;
    });
  }
}

module.exports.CatalogModel = CatalogModel;
