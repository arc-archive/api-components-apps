import { BaseModel } from './base-model';
import semver from 'semver';
/**
 * A model for catalog items.
 */
export class ComponentModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  get componentExcludeIndexes() {
    return ['version', 'versions[]', 'group', 'org', 'pkg', 'ref', 'scope'];
  }

  get versionExcludeIndexes() {
    return ['name', 'version', 'docs', 'changelog'];
  }

  _createGroupKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.groupsKind, this.slug(name)]
    });
  }

  _createComponentKey(groupName, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.groupsKind, this.slug(groupName), this.componentsKind, this.slug(componentName)]
    });
  }

  /**
   * Creates datastore key for version object
   * @param {String} groupName Component's group
   * @param {String} componentName Component name
   * @param {String} version Component version
   * @return {Object}
   */
  _createVersionKey(groupName, componentName, version) {
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
  /**
   * Finds largest non-pre-release version in the list of versions.
   * @param {Array<String>} range List of semver versions.
   * @return {String} Largest version in the list.
   */
  findLatestVersion(range) {
    if (!range || !range.length) {
      return;
    }
    let latest = range[0];
    for (let i = 1, len = range.length; i < len; i++) {
      const ver = range[i];
      if (semver.prerelease(ver)) {
        continue;
      }
      if (semver.gt(ver, latest)) {
        latest = ver;
      }
    }
    return latest;
  }

  /**
   * Lists groups.
   *
   * @param {?Number} limit Number of results to return in the query.
   * @param {?String} nextPageToken Datastore start token.
   * @return {Promise<Array>} Promise resolved to a list of components.
   */
  listGroups(limit, nextPageToken) {
    if (!limit) {
      limit = this.listLimit;
    }
    let query = this.store.createQuery(this.namespace, this.groupsKind);
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }
  /**
   * Lists components.
   *
   * @param {?Number} limit Number of results to return in the query.
   * @param {?String} nextPageToken Datastore start token.
   * @param {?String} group Group name, when set it limits results to a specific group
   * @return {Promise<Array>} Promise resolved to a list of components.
   */
  listComponents(limit, nextPageToken, group) {
    if (!limit) {
      limit = this.listLimit;
    }
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', {
      descending: false
    });
    if (group) {
      const key = this._createGroupKey(group);
      query = query.hasAncestor(key);
    }
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map((item) => {
        delete item.ref;
        const key = item[this.store.KEY];
        item.id = item[this.store.KEY].name;
        item.groupId = key.parent.name;
        item.version = this.findLatestVersion(item.versions);
        return item;
      });
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  queryComponents(limit, nextPageToken, filters) {
    if (!limit) {
      limit = this.listLimit;
    }
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', {
      descending: false
    });
    if (filters.group) {
      const key = this._createGroupKey(filters.group);
      query = query.hasAncestor(key);
    }
    if (filters.tags && filters.tags.length) {
      filters.tags.forEach((tag) => {
        query = query.filter('tags', '=', tag);
      });
    }
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map((item) => {
        delete item.ref;
        const key = item[this.store.KEY];
        item.id = item[this.store.KEY].name;
        item.groupId = key.parent.name;
        item.version = this.findLatestVersion(item.versions);
        return item;
      });
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }
  /**
   * Lists names of API components (with `apic` tag)
   * @return {Promise<Array>} Promise resolved to a list of names.
   */
  async listApiComponents() {
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.filter('tags', '=', 'apic');
    const [components] = await this.store.runQuery(query);
    if (!components) {
      return [];
    }
    return components.map((item) => this.fromDatastore(item));
  }
  /**
   * Lists version of a component.
   * @param {String} group Component group id
   * @param {String} component Component id
   * @param {?Number} limit Number of results to return in the query.
   * @param {?String} nextPageToken Datastore start token.
   * @return {Promise<Array>}
   */
  listVersions(group, component, limit, nextPageToken) {
    if (!limit) {
      limit = this.listLimit;
    }
    const key = this._createComponentKey(group, component);
    let query = this.store.createQuery(this.namespace, this.versionsKind).hasAncestor(key);
    query = query.order('created', {
      descending: true
    });
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map((item) => {
        const key = item[this.store.KEY];
        item.id = key.name;
        item.group = key.parent.parent.name;
        return item;
      });
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  /**
   * Creates a new version of API component in the data store.
   *
   * @param {Object} info Component description:
   * - {String} version Component version
   * - {String} component Component name
   * - {String} group Component's group
   * - {String} pkg Package name
   * - {String} org Oganization name
   * - {String} docs Data to store
   * - {String} changeLog Changelog string to store with version
   * @return {Promise}
   */
  async addVersion(info) {
    const { group, component, version, pkg, org, docs, changeLog } = info;
    await this._ensureGroup(group);
    const cmp = await this._ensureComponent(version, component, group, pkg, org);
    await this._ensureVersion(cmp, version, component, group, docs, changeLog);
  }
  /**
   * Creates a group of components if it does not exist.
   *
   * @param {String} groupName Name of the group
   * @return {Promise}
   */
  async _ensureGroup(groupName) {
    const key = this._createGroupKey(groupName);
    try {
      return await this.store.get(key);
    } catch (_) {
      return await this._createGroup(groupName, key);
    }
  }
  /**
   * Returns group model.
   * @param {String} name Group name
   * @return {Promise<Object>}
   */
  getGroup(name) {
    const key = this._createGroupKey(name);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
  /**
   * Creates a component group entity.
   *
   * @param {String} name Name of the group
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  _createGroup(name, key) {
    const data = [
      {
        name: 'name',
        value: name,
        excludeFromIndexes: true
      }
    ];
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
   * @param {String} pkg Component package name
   * @param {String} org Component organization
   * @return {Promise}
   */
  async _ensureComponent(version, componentName, groupName, pkg, org) {
    const key = this._createComponentKey(groupName, componentName);
    let data;
    try {
      data = await this.store.get(key);
    } catch (e) {
      // ...
    }
    if (!data || !data[0]) {
      return await this._createComponent(componentName, version, groupName, pkg, org, key);
    } else {
      return await this._addComponentVersion(data[0], version, key);
    }
  }
  /**
   * Returns component definition.
   * @param {String} groupName Group id
   * @param {String} componentName Component id
   * @return {Promise<Object>}
   */
  async getComponent(groupName, componentName) {
    const key = this._createComponentKey(groupName, componentName);
    const entity = await this.store.get(key);
    if (entity && entity[0]) {
      return this.fromDatastore(entity[0]);
    }
  }
  /**
   * Creates a component.
   *
   * @param {String} name Name of the group
   * @param {String} version Component version
   * @param {String} groupName Component's group
   * @param {String} pkg Component package name
   * @param {String} org Component organization
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  async _createComponent(name, version, groupName, pkg, org, key) {
    const data = [
      {
        name: 'name',
        value: name,
        excludeFromIndexes: false
      },
      {
        name: 'version',
        value: version,
        excludeFromIndexes: true
      },
      {
        name: 'versions',
        value: [version],
        excludeFromIndexes: true
      },
      {
        name: 'group',
        value: groupName,
        excludeFromIndexes: true
      },
      {
        name: 'pkg',
        value: pkg,
        excludeFromIndexes: true
      },
      {
        name: 'org',
        value: org,
        excludeFromIndexes: true
      }
    ];
    const entity = {
      key,
      data
    };
    await this.store.upsert(entity);
    const [entry] = await this.store.get(key);
    if (entry) {
      return this.fromDatastore(entry);
    }
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
    let promise;
    if (model.versions.indexOf(version) !== -1) {
      promise = Promise.resolve();
    } else {
      model.versions[model.versions.length] = version;
      if (!semver.prerelease(version)) {
        model.version = version;
      }
      const entity = {
        key,
        data: model,
        excludeFromIndexes: this.componentExcludeIndexes
      };
      promise = this.store.update(entity);
    }
    return promise
        .then(() => this.store.get(key))
        .then((entity) => {
          if (entity && entity[0]) {
            return this.fromDatastore(entity[0]);
          }
        });
  }
  /**
   * Replaces/creates version in the datastrore
   *
   * @param {Object} parent Parent component
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} data Polymer analysis result
   * @param {?String} changelog Version changelog
   * @return {Promise}
   */
  _ensureVersion(parent, version, componentName, groupName, data, changelog) {
    const key = this._createVersionKey(groupName, componentName, version);
    return this.store
        .get(key)
        .catch(() => {})
        .then((model) => {
          if (!model || !model[0]) {
            return this._createVersion(parent, version, componentName, groupName, data, changelog);
          } else {
            model = model[0];
            model.created = Date.now();
            model.docs = JSON.stringify(data);
            if (parent.tags) {
              model.tags = parent.tags;
            } else if (model.tags) {
              delete model.tags;
            }
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
   * @param {Object} parent Parent component
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} docs Polymer analysis result
   * @param {?String} changelog
   * @return {Promise}
   */
  _createVersion(parent, version, componentName, groupName, docs, changelog) {
    const key = this._createVersionKey(groupName, componentName, version);
    const data = [
      {
        name: 'name',
        value: componentName,
        excludeFromIndexes: true
      },
      {
        name: 'docs',
        value: JSON.stringify(docs),
        excludeFromIndexes: true
      },
      {
        name: 'created',
        value: Date.now(),
        excludeFromIndexes: false
      }
    ];
    if (parent.tags) {
      data.push({
        name: 'tags',
        value: parent.tags,
        excludeFromIndexes: false
      });
    }
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
  /**
   * Returns component definition.
   * @param {String} groupName Group name
   * @param {String} componentName Component name
   * @param {String} version Version name.
   * @return {Promise<Object>}
   */
  getVersion(groupName, componentName, version) {
    const key = this._createVersionKey(groupName, componentName, version);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
  /**
   * Queries for versions.
   * @param {?Number} limit Number of results to return in the query.
   * @param {?String} nextPageToken Datastore start token.
   * @param {Object} filters Map for: group, component, tags, and until
   * @return {Promise}
   */
  queryVersions(limit, nextPageToken, filters) {
    if (!limit) {
      limit = this.listLimit;
    }
    let query = this.store.createQuery(this.namespace, this.versionsKind);
    query = query.order('created', {
      descending: true
    });
    if (filters.group && filters.component) {
      const key = this._createComponentKey(filters.group, filters.component);
      query = query.hasAncestor(key);
    }
    if (filters.tags && filters.tags.length) {
      filters.tags.forEach((tag) => {
        query = query.filter('tags', '=', tag);
      });
    }
    if (filters.since) {
      query = query.filter('created', '>=', Number(filters.since));
    }
    if (filters.until) {
      query = query.filter('created', '<=', Number(filters.until));
    }
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map((item) => {
        const key = item[this.store.KEY];
        item.id = key.name;
        item.group = key.parent.parent.name;
        return item;
      });
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  async updateComponentProperties(groupName, componentName, props) {
    const key = this._createComponentKey(groupName, componentName);
    const transaction = this.store.transaction();
    try {
      await transaction.run();
      const [test] = await transaction.get(key);
      Object.keys(props).forEach((key) => {
        test[key] = props[key];
      });
      transaction.save({
        key: key,
        data: test,
        excludeFromIndexes: this.componentExcludeIndexes
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  // async updatePackages() {
  //   let query = this.store.createQuery(this.namespace, this.componentsKind);
  //   const [items] = await this.store.runQuery(query);
  //   const updates = [];
  //   for (let i = 0; i < items.length; i++) {
  //     const item = items[i];
  //     if (item.name) {
  //       continue;
  //     }
  //     const key = item[this.store.KEY];
  //     const group = key.parent.name;
  //     const component = item.pkg.split('/')[1];
  //     const [dbVersions] = await this.listVersions(group, component);
  //     const [versions, last] = this.readVersions(dbVersions);
  //     item.versions = versions;
  //     item.version = last;
  //     item.name = component;
  //     let groupName = group.replace(/\b-([a-z])/g, (_, char) => char.toUpperCase());
  //     groupName = groupName[0].toUpperCase() + groupName.substr(1);
  //     item.group = groupName;
  //     item.ref = component;
  //     updates[updates.length] = {
  //       key,
  //       data: item,
  //       excludeFromIndexes: this.componentExcludeIndexes
  //     };
  //     // if (updates.length === 3) {
  //     //   break;
  //     // }
  //   }
  //   if (!updates.length) {
  //     return;
  //   }
  //   const transaction = this.store.transaction();
  //   await transaction.run();
  //   transaction.save(updates);
  //   await transaction.commit();
  // }
  //
  // async listVersions(group, component) {
  //   let query = this.store.createQuery(this.namespace, this.versionsKind);
  //   const key = this._createComponentKey(group, component);
  //   query = query.hasAncestor(key);
  //   query = query.select('__key__');
  //   return await this.store.runQuery(query);
  // }
  //
  // readVersions(entries) {
  //   const result = [];
  //   let latest;
  //   for (let i = 0, len = entries.length; i < len; i++) {
  //     const key = entries[i][this.store.KEY];
  //     const ver = key.name;
  //     result[result.length] = ver;
  //     if (!latest) {
  //       latest = ver;
  //     } else if (semver.gt(ver, latest)) {
  //       latest = ver;
  //     }
  //   }
  //   return [result, latest];
  // }
}
