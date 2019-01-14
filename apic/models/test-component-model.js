'use strict';
const Datastore = require('@google-cloud/datastore');
const config = require('../../config');
const slug = require('slug');
const decamelize = require('decamelize');
const logging = require('../../lib/logging');
/**
 * A model for a componet test results in a run.
 */
class TestsComponentModel {
  /**
   * @constructor
   */
  constructor() {
    this.namespace = 'api-components-tests';
    this.testKind = 'Test';
    this.componentsKind = 'Component';
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

  _createKey(testId, componentName) {
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

  create(testId, componentName) {
    const key = this._createKey(testId, componentName);
    const results = [{
      name: 'component',
      value: componentName
    }, {
      name: 'status',
      value: 'running'
    }, {
      name: 'startTime',
      value: Date.now()
    }];

    const entity = {
      key,
      data: results,
      excludeFromIndexes: [
        'component', 'status'
      ]
    };
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (data && data[0]) {
        return this.store.delete(key);
      }
    })
    .then(() => this.store.upsert(entity));
  }

  get(testId, componentName) {
    const key = this._createKey(testId, componentName);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  updateComponent(testId, componentName, report) {
    const transaction = this.store.transaction();
    const key = this._createKey(testId, componentName);
    return transaction.run()
    .then(() => transaction.get(key))
    .then((data) => {
      const [component] = data;
      component.status = report.passing ? 'passed' : 'failed';
      if (report.retry) {
        component.retries = report.retry;
      }
      component.passed = report.passed;
      component.failed = report.failed;
      component.endTime = report.endTime;
      component.hasLogs = !!report.results.length;
      if (report.message) {
        component.message = report.message;
      }
      transaction.save({
        key: key,
        data: component,
        excludeFromIndexes: [
          'passed', 'failed', 'endTime', 'retries', 'status', 'hasLogs', 'message'
        ]
      });
      return transaction.commit();
    })
    .catch((cause) => {
      transaction.rollback();
      return Promise.reject(cause);
    });
  }

  updateComponentError(testId, componentName, message) {
    const transaction = this.store.transaction();
    const key = this._createKey(testId, componentName);
    return transaction.run()
    .then(() => transaction.get(key))
    .then((data) => {
      const [component] = data;
      component.status = 'failed';
      component.error = true;
      component.endTime = Date.now();
      component.hasLogs = false;
      component.message = message;
      transaction.save({
        key: key,
        data: component,
        excludeFromIndexes: [
          'passed', 'failed', 'endTime', 'retries', 'status', 'hasLogs', 'message', 'error'
        ]
      });
      return transaction.commit();
    })
    .catch((cause) => {
      console.error(cause);
      logging.error(cause);
      transaction.rollback();
    });
  }

  getTestKey(testId) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId
      ]
    });
  }

  fromDatastore(obj) {
    obj.id = obj[this.store.KEY].name;
    return obj;
  }

  list(testId, limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    const ancestorKey = this.getTestKey(testId);
    let query = this.store.createQuery(this.namespace, this.componentsKind).hasAncestor(ancestorKey);
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
}

module.exports.TestsComponentModel = TestsComponentModel;
