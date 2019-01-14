'use strict';
const Datastore = require('@google-cloud/datastore');
const config = require('../../config');
const background = require('../../lib/background');
const logging = require('../../lib/logging');
const uuidv4 = require('uuid/v4');
/**
 * A model for catalog items.
 */
class TestsModel {
  /**
   * @constructor
   */
  constructor() {
    this.namespace = 'api-components-tests';
    this.testKind = 'Test';
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace
    });
  }

  get excludedIndexes() {
    return ['type', 'commit', 'branch', 'status', 'size', 'passed', 'failed', 'component'];
  }

  /**
   * Translates from Datastore's entity format to
   * the format expected by the application.
   *
   * Datastore format:
   *    {
   *      key: [kind, id],
   *      data: {
   *        property: value
   *      }
   *    }
   *
   *  Application format:
   *    {
   *      id: id,
   *      property: value
   *    }
   * @param {Object} obj Datastore entry
   * @return {Object}
   */
  fromDatastore(obj) {
    obj.id = obj[this.store.KEY].name;
    return obj;
  }

  listTests(limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    let query = this.store.createQuery(this.namespace, this.testKind);
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

  insertTest(info) {
    const now = Date.now();
    const keyName = uuidv4();
    const key = this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        keyName
      ]
    });
    const results = [{
      name: 'type',
      value: info.type,
      excludeFromIndexes: true
    }, {
      name: 'branch',
      value: info.branch,
      excludeFromIndexes: true
    }, {
      name: 'startTime',
      value: now
    }, {
      name: 'status',
      value: 'queued',
      excludeFromIndexes: true
    }];

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

    const entity = {
      key,
      data: results
    };

    return this.store.upsert(entity)
    .then(() => {
      logging.info('Created test entry: ' + keyName);
      background.queueTest(keyName);
      return keyName;
    });
  }

  _createKey(id) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        id
      ]
    });
  }

  getTest(id) {
    const key = this._createKey(id);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  updateTestScope(id, componentsSize) {
    return this.updateTestProperties(id, {
      status: 'running',
      size: componentsSize
    });
  }

  setComponentError(id) {
    const transaction = this.store.transaction();
    const key = this._createKey(id);
    return transaction.run()
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

  updateComponentResult(id, report) {
    const transaction = this.store.transaction();
    const key = this._createKey(id);
    return transaction.run()
    .then(() => transaction.get(key))
    .then((data) => {
      const [test] = data;
      if (test.status === 'queued') {
        test.status = 'running';
      }
      if (report.passing) {
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
      return transaction.commit();
    })
    .catch((cause) => {
      transaction.rollback();
      return Promise.reject(cause);
    });
  }

  finishTest(id) {
    return this.updateTestProperties(id, {
      status: 'finished'
    });
  }

  updateTestProperties(id, props) {
    const transaction = this.store.transaction();
    const key = this._createKey(id);
    return transaction.run()
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
}

module.exports.TestsModel = TestsModel;
