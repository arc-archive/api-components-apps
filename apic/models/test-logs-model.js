'use strict';
const Datastore = require('@google-cloud/datastore');
const config = require('../../config');
const slug = require('slug');
const decamelize = require('decamelize');
const logging = require('../../lib/logging');
/**
 * A model for a componet test results in a run.
 */
class TestsLogsModel {
  /**
   * @constructor
   */
  constructor() {
    this.namespace = 'api-components-tests';
    this.testKind = 'Test';
    this.componentsKind = 'Component';
    this.testLogsKind = 'TestComponentLogs';
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace
    });
  }

  /**
   * Creates a slug from a string.
   *
   * @param {String} name Value to slug,
   * @return {String}
   */
  slug(name) {
    return slug(decamelize(name, '-'));
  }

  _createKey(testId, componentName, id) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId,
        this.componentsKind,
        this.slug(componentName),
        this.testLogsKind,
        id
      ]
    });
  }

  _makeBrowserId(browser) {
    return browser.browser + browser.version;
  }

  addLogs(testId, componentName, results) {
    const transaction = this.store.transaction();
    return transaction.run()
    .then(() => {
      const entities = [];
      for (let i = 0, len = results.length; i < len; i++) {
        const browser = results[i];
        const id = this._makeBrowserId(browser);
        const key = this._createKey(testId, componentName, id);
        const data = [{
          name: 'browser',
          value: browser.browser,
          excludeFromIndexes: true
        }, {
          name: 'version',
          value: browser.version,
          excludeFromIndexes: true
        }, {
          name: 'endTime',
          value: browser.endTime,
          excludeFromIndexes: true
        }, {
          name: 'startTime',
          value: browser.startTime,
          excludeFromIndexes: true
        }];
        if (browser.message) {
          data[data.length] = {
            name: 'message',
            value: browser.message,
            excludeFromIndexes: true
          };
        }
        if (browser.logs) {
          data[data.length] = {
            name: 'logs',
            value: browser.logs,
            excludeFromIndexes: true
          };
        }
        entities[entities.length] = {
          key,
          data
        };
      }

      transaction.save(entities);
      return transaction.commit();
    })
    .catch((cause) => {
      console.error('Error adding test logs', cause);
      console.log(results);
      transaction.rollback();
      return Promise.reject(cause);
    });
  }

  fromDatastore(obj) {
    obj.id = obj[this.store.KEY].name;
    return obj;
  }

  getComponentKey(testId, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId,
        this.componentsKind,
        this.slug(componentName)
      ]
    });
  }

  list(testId, componentName, limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    const ancestorKey = this.getComponentKey(testId, componentName);
    let query = this.store.createQuery(this.namespace, this.testLogsKind).hasAncestor(ancestorKey);
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query)
    .then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== Datastore.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  get(testId, componentName, logId) {
    const key = this._createKey(testId, componentName, logId);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
}

module.exports.TestsLogsModel = TestsLogsModel;
