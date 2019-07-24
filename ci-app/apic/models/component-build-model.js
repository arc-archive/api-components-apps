'use strict';
const background = require('../../lib/background');
const logging = require('../../lib/logging');
const { BaseModel } = require('./base-model');
const uuidv4 = require('uuid/v4');
/**
 * A model for catalog items.
 */
class ComponentBuildModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-builds');
  }

  get excludedIndexes() {
    return ['type', 'commit', 'branch', 'status', 'component', 'error', 'message', 'sshUrl'];
  }

  list(limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    let query = this.store.createQuery(this.namespace, this.buildKind);
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

  insertBuild(info) {
    const now = Date.now();
    const id = uuidv4();
    const key = this.createBuildKey(id);
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
        name: 'component',
        value: info.component,
        excludeFromIndexes: true
      },
      {
        name: 'commit',
        value: info.commit,
        excludeFromIndexes: true
      },
      {
        name: 'sshUrl',
        value: info.sshUrl,
        excludeFromIndexes: true
      }
    ];

    const entity = {
      key,
      data: results
    };

    return this.store.upsert(entity).then(() => {
      logging.info('Created build entry: ' + id);
      background.queueStageBuild(id);
      return this.get(id);
    });
  }

  get(id) {
    const key = this.createBuildKey(id);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  startBuild(id) {
    return this.updateBuildProperties(id, {
      status: 'running',
      startTime: Date.now()
    });
  }

  setBuildError(id, message) {
    return this.updateBuildProperties(id, {
      status: 'finished',
      endTime: Date.now(),
      error: true,
      message
    });
  }

  finishBuild(id, message) {
    const props = {
      status: 'finished',
      endTime: Date.now()
    };
    if (message) {
      props.message = message;
    }
    return this.updateBuildProperties(id, props);
  }

  updateBuildProperties(id, props) {
    const transaction = this.store.transaction();
    const key = this.createBuildKey(id);
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

  delete(id) {
    background.dequeueBuild(id);
    const key = this.createBuildKey(id);
    return this.store.delete(key);
  }
}

module.exports.ComponentBuildModel = ComponentBuildModel;
