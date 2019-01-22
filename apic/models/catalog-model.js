const {BaseModel} = require('./base-model');
/**
 * A model for catalog items.
 */
class CatalogModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  get componentExcludeIndexes() {
    return [
      'name', 'version', 'versions', 'group'
    ];
  }

  get versionExcludeIndexes() {
    return [
      'name', 'version', 'docs', 'changelog'
    ];
  }

  _getGroupKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(name)
      ]
    });
  }

  _createComponentKey(groupName, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName),
        this.componentsKind,
        this.slug(componentName)
      ]
    });
  }

  /**
   * Creates datastore key for version object
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @return {Object}
   */
  _createVersionKey(version, componentName, groupName) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName),
        this.componentsKind,
        this.slug(componentName),
        this.versionsKind,
        version
      ]
    });
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

  /**
   * Creates a new version of API component in the data store.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {String} data Data to store
   * @param {?String} changelog Changelog string to store with version
   * @return {Promise}
   */
  addVersion(version, componentName, groupName, data, changelog) {
    return this._ensureGroup(groupName)
    .then(() => this._ensureComponent(version, componentName, groupName))
    .then(() => this._ensureVersion(version, componentName, groupName, data, changelog));
  }
  /**
   * Creates a group of components if it does not exist.
   *
   * @param {String} groupName Name of the group
   * @return {Promise}
   */
  _ensureGroup(groupName) {
    const key = this._getGroupKey(groupName);
    return this.store.get(key)
    .catch(() => this._createGroup(groupName, key));
  }
  /**
   * Creates a component group entity.
   *
   * @param {String} name Name of the group
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  _createGroup(name, key) {
    const data = [{
      name: 'name',
      value: name,
      excludeFromIndexes: true
    }, {
      name: 'ref',
      value: this.slug(name),
      excludeFromIndexes: false
    }];
    const entity = {
      key,
      data
    };
    return this.store.upsert(entity);
  }
  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @return {Promise}
   */
  _ensureComponent(version, componentName, groupName) {
    const key = this._createComponentKey(groupName, componentName);
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (!data || !data[0]) {
        return this._createComponent(componentName, version, groupName, key);
      } else {
        return this._addComponentVersion(data[0], version, key);
      }
    });
  }

  /**
   * Creates a component.
   *
   * @param {String} name Name of the group
   * @param {String} version Component version
   * @param {String} groupName Component's group
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  _createComponent(name, version, groupName, key) {
    const data = [{
      name: 'ref',
      value: this.slug(name),
      excludeFromIndexes: false
    }, {
      name: 'name',
      value: name,
      excludeFromIndexes: true
    }, {
      name: 'version',
      value: version,
      excludeFromIndexes: true
    }, {
      name: 'versions',
      value: [version],
      excludeFromIndexes: true
    }, {
      name: 'group',
      value: groupName,
      excludeFromIndexes: true
    }];
    const entity = {
      key,
      data
    };
    return this.store.upsert(entity);
  }
  /**
   * Adds a new version to the component model.
   * @param {Object} model Existing model
   * @param {String} version Version number
   * @param {Object} key Datastore key
   * @return {Object} updated model
   */
  _addComponentVersion(model, version, key) {
    if (!model.versions) {
      model.versions = [];
    }
    if (model.versions.indexOf(version) !== -1) {
      return;
    }
    model.versions[model.versions.length] = version;
    model.version = version;
    const entity = {
      key,
      data: model,
      excludeFromIndexes: this.componentExcludeIndexes
    };
    return this.store.update(entity);
  }
  /**
   * Replaces/creates version in the datastroe
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} data Polymer analysis result
   * @param {?String} changelog Version changelog
   * @return {Promise}
   */
  _ensureVersion(version, componentName, groupName, data, changelog) {
    const key = this._createVersionKey(version, componentName, groupName);
    return this.store.get(key)
    .catch(() => {})
    .then((model) => {
      if (!model || !model[0]) {
        return this._createVersion(version, componentName, groupName, data, changelog);
      } else {
        model = model[0];
        model.created = Date.now();
        model.docs = JSON.stringify(data);
        if (changelog) {
          model.changelog = changelog;
        } else if (model.changelog) {
          delete model.changelog;
        }
        const entity = {
          key,
          data: model,
          excludeFromIndexes: this.versionExcludeIndexes
        };
        return this.store.update(entity);
      }
    });
  }
  /**
   * Creates component version entity.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} docs Polymer analysis result
   * @param {?String} changelog
   * @return {Promise}
   */
  _createVersion(version, componentName, groupName, docs, changelog) {
    const key = this._createVersionKey(version, componentName, groupName);
    const data = [{
      name: 'name',
      value: componentName,
      excludeFromIndexes: true
    }, {
      name: 'version',
      value: version,
      excludeFromIndexes: true
    }, {
      name: 'docs',
      value: JSON.stringify(docs),
      excludeFromIndexes: true
    }, {
      name: 'created',
      value: Date.now(),
      excludeFromIndexes: false
    }];
    if (changelog) {
      data.push({
        name: 'changelog',
        value: changelog,
        excludeFromIndexes: true
      });
    }
    const entity = {
      key,
      data
    };
    return this.store.upsert(entity);
  }
}

module.exports.CatalogModel = CatalogModel;
