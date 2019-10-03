'use strict';
const { BaseModel } = require('./base-model');
const logging = require('../../lib/logging');
/**
 * A model for a componet test results in a run.
 */
class TestsComponentModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  create(testId, componentName) {
    const key = this.createTestComponentKey(testId, componentName);
    const results = [
      {
        name: 'component',
        value: componentName,
        excludeFromIndexes: true
      },
      {
        name: 'status',
        value: 'running',
        excludeFromIndexes: true
      },
      {
        name: 'startTime',
        value: Date.now()
      }
    ];

    const entity = {
      key,
      data: results
    };
    return this.store
      .get(key)
      .catch(() => {})
      .then((data) => {
        if (data && data[0]) {
          return this.store.delete(key);
        }
      })
      .then(() => this.store.upsert(entity));
  }

  get(testId, componentName) {
    const key = this.createTestComponentKey(testId, componentName);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  async updateComponent(testId, componentName, report) {
    const transaction = this.store.transaction();
    const key = this.createTestComponentKey(testId, componentName);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [component] = data;
      component.status = report.error ? 'failed' : 'passed';
      component.total = report.total;
      component.success = report.success;
      component.failed = report.failed;
      component.skipped = report.skipped;
      component.hasLogs = !!report.results.length;
      transaction.save({
        key: key,
        data: component,
        excludeFromIndexes: ['total', 'success', 'failed', 'skipped', 'status', 'hasLogs']
      });
      return await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  async updateComponentError(testId, componentName, message) {
    const transaction = this.store.transaction();
    const key = this.createTestComponentKey(testId, componentName);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [component] = data;
      component.status = 'failed';
      component.error = true;
      component.hasLogs = false;
      component.message = message;
      transaction.save({
        key: key,
        data: component,
        excludeFromIndexes: ['total', 'success', 'failed', 'skipped', 'status', 'hasLogs', 'message', 'error']
      });
      return await transaction.commit();
    } catch (cause) {
      logging.error(cause);
      transaction.rollback();
    }
  }

  list(testId, limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    const ancestorKey = this.createTestKey(testId);
    let query = this.store.createQuery(this.namespace, this.componentsKind).hasAncestor(ancestorKey);
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

  clearResult(testId) {
    const transaction = this.store.transaction();
    const ancestorKey = this.createTestKey(testId);
    return transaction
      .run()
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.componentsKind).hasAncestor(ancestorKey);
        return query.run();
      })
      .then((result) => {
        const keys = result[0].map((item) => item[this.store.KEY]);
        if (keys.length) {
          transaction.delete(keys);
        }
        return transaction.commit();
      })
      .catch((cause) => {
        transaction.rollback();
        return Promise.reject(cause);
      });
  }
}

module.exports.TestsComponentModel = TestsComponentModel;
