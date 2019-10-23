import { BaseModel } from './base-model';
import logging from '../lib/logging';
/**
 * A model for a componet test results in a run.
 */
export class TestsLogsModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  _makeBrowserId(browser) {
    return browser.browser.split(' ').slice(0, 2).join('-');
  }

  get excludeFromIndexes() {
    return [
      'browser', 'endTime', 'startTime', 'total', 'success', 'failed',
      'skipped', 'error', 'message', 'logs[]'
    ];
  }

  async addLogs(testId, componentName, results) {
    const transaction = this.store.transaction();
    try {
      await transaction.run();
      const entities = [];
      for (let i = 0, len = results.length; i < len; i++) {
        const browser = results[i];
        const id = this._makeBrowserId(browser);
        const key = this.createTestLogKey(testId, componentName, id);
        const data = [
          {
            name: 'browser',
            value: browser.browser,
            excludeFromIndexes: true
          },
          {
            name: 'endTime',
            value: browser.endTime,
            excludeFromIndexes: true
          },
          {
            name: 'startTime',
            value: browser.startTime,
            excludeFromIndexes: true
          },
          {
            name: 'total',
            value: browser.total,
            excludeFromIndexes: true
          },
          {
            name: 'success',
            value: browser.success,
            excludeFromIndexes: true
          },
          {
            name: 'failed',
            value: browser.failed,
            excludeFromIndexes: true
          },
          {
            name: 'skipped',
            value: browser.skipped,
            excludeFromIndexes: true
          },
          {
            name: 'error',
            value: browser.error,
            excludeFromIndexes: true
          }
        ];
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
          data,
          excludeFromIndexes: this.excludeFromIndexes
        };
      }

      transaction.save(entities);
      return transaction.commit();
    } catch (cause) {
      logging.error('Error adding test logs', cause);
      logging.log(results);
      transaction.rollback();
      throw cause;
    }
  }

  list(testId, componentName, limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    const ancestorKey = this.createTestComponentKey(testId, componentName);
    let query = this.store.createQuery(this.namespace, this.testLogsKind).hasAncestor(ancestorKey);
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

  get(testId, componentName, logId) {
    const key = this.createTestLogKey(testId, componentName, logId);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  clearLogs(testId) {
    const transaction = this.store.transaction();
    const ancestorKey = this.createTestKey(testId);
    return transaction
      .run()
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.testLogsKind).hasAncestor(ancestorKey);
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
