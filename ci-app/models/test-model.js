import background from '../lib/background';
import logging from '../lib/logging';
import { BaseModel } from './base-model';
import uuidv4 from 'uuid/v4';
/**
 * A model for catalog items.
 */
export class TestsModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  get excludedIndexes() {
    return [
      'type',
      'commit',
      'branch',
      'status',
      'size',
      'passed',
      'failed',
      'component',
      'error',
      'message',
      'includeDev',
      'org',
      'creator.id',
      'creator.displayName',
    ];
  }

  listTests(limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    let query = this.store.createQuery(this.namespace, this.testKind);
    query = query.limit(limit);
    query = query.order('created', {
      descending: true
    });
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query).then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  insertTest(info) {
    const now = Date.now();
    const keyName = uuidv4();
    const key = this.createTestKey(keyName);
    const results = [
      {
        name: 'type',
        value: info.type,
        excludeFromIndexes: true
      },
      {
        name: 'branch',
        value: info.branch,
        excludeFromIndexes: true
      },
      {
        name: 'created',
        value: now
      },
      {
        name: 'status',
        value: 'queued',
        excludeFromIndexes: true
      },
      {
        name: 'creator',
        value: info.creator,
        excludeFromIndexes: true
      }
    ];

    if (info.commit) {
      results.push({
        name: 'commit',
        value: info.commit,
        excludeFromIndexes: true
      });
    }

    if (info.component) {
      results.push({
        name: 'component',
        value: info.component,
        excludeFromIndexes: true
      });
    }
    if (info.org) {
      results.push({
        name: 'org',
        value: info.org,
        excludeFromIndexes: true
      });
    }
    if (typeof info.includeDev === 'boolean') {
      results.push({
        name: 'includeDev',
        value: info.includeDev,
        excludeFromIndexes: true
      });
    }
    const entity = {
      key,
      data: results
    };

    return this.store.upsert(entity).then(() => {
      logging.info('Created test entry: ' + keyName);
      background.queueTest(keyName);
      return keyName;
    });
  }

  resetTest(testId) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(testId);
    return transaction
      .run()
      .then(() => transaction.get(key))
      .then((data) => {
        const [test] = data;
        test.status = 'queued';
        delete test.passed;
        delete test.failed;
        delete test.size;
        delete test.startTime;
        delete test.error;
        delete test.message;
        transaction.save({
          key: key,
          data: test,
          excludeFromIndexes: this.excludedIndexes
        });
      })
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.testLogsKind).hasAncestor(key);
        return query.run();
      })
      .then((result) => {
        const keys = result[0].map((item) => item[this.store.KEY]);
        if (keys.length) {
          transaction.delete(keys);
        }
      })
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.componentsKind).hasAncestor(key);
        return query.run();
      })
      .then((result) => {
        const keys = result[0].map((item) => item[this.store.KEY]);
        if (keys.length) {
          transaction.delete(keys);
        }
      })
      .then(() => {
        return transaction.commit();
      })
      .then(() => {
        background.queueTest(testId);
      })
      .catch((cause) => {
        transaction.rollback();
        return Promise.reject(cause);
      });
  }

  getTest(id) {
    const key = this.createTestKey(id);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  startTest(id) {
    return this.updateTestProperties(id, {
      status: 'running',
      startTime: Date.now()
    });
  }

  setTestError(id, message) {
    return this.updateTestProperties(id, {
      status: 'finished',
      endTime: Date.now(),
      error: true,
      message
    });
  }

  updateTestScope(id, size) {
    return this.updateTestProperties(id, {
      size
    });
  }

  setComponentError(id) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    return transaction
      .run()
      .then(() => transaction.get(key))
      .then((data) => {
        const [test] = data;
        if (test.status === 'queued') {
          test.status = 'running';
        }
        if (!test.failed) {
          test.failed = 0;
        }
        test.failed++;
        transaction.save({
          key: key,
          data: test,
          excludeFromIndexes: this.excludedIndexes
        });
        return transaction.commit();
      })
      .catch((cause) => {
        transaction.rollback();
        return Promise.reject(cause);
      });
  }

  async updateComponentResult(id, report) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [test] = data;
      if (test.status === 'queued') {
        test.status = 'running';
      }
      if (!report.error) {
        if (!test.passed) {
          test.passed = 0;
        }
        test.passed++;
      } else {
        if (!test.failed) {
          test.failed = 0;
        }
        test.failed++;
      }
      transaction.save({
        key: key,
        data: test,
        excludeFromIndexes: this.excludedIndexes
      });
      return await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  finishTest(id, message) {
    const props = {
      status: 'finished',
      endTime: Date.now()
    };
    if (message) {
      props.message = message;
    }
    return this.updateTestProperties(id, props);
  }

  updateTestProperties(id, props) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    return transaction
      .run()
      .then(() => transaction.get(key))
      .then((data) => {
        const [test] = data;
        Object.keys(props).forEach((key) => {
          test[key] = props[key];
        });
        transaction.save({
          key: key,
          data: test,
          excludeFromIndexes: this.excludedIndexes
        });
        return transaction.commit();
      })
      .catch((cause) => {
        transaction.rollback();
        return Promise.reject(cause);
      });
  }

  deleteTest(id) {
    background.dequeueTest(id);
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    return transaction
      .run()
      .then(() => transaction.delete(key))
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.testLogsKind).hasAncestor(key);
        return query.run();
      })
      .then((result) => {
        const keys = result[0].map((item) => item[this.store.KEY]);
        if (keys.length) {
          transaction.delete(keys);
        }
      })
      .then(() => {
        const query = transaction.createQuery(this.namespace, this.componentsKind).hasAncestor(key);
        return query.run();
      })
      .then((result) => {
        const keys = result[0].map((item) => item[this.store.KEY]);
        if (keys.length) {
          transaction.delete(keys);
        }
      })
      .then(() => {
        return transaction.commit();
      })
      .catch((cause) => {
        transaction.rollback();
        return Promise.reject(cause);
      });
  }
}
