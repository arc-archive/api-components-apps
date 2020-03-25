import background from '../lib/background';
import logging from '../lib/logging';
import { BaseModel } from './base-model';
import { v4 as uuidv4 } from 'uuid';
/**
 * A model for catalog items.
 */
export class ComponentBuildModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-builds');
  }

  get excludedIndexes() {
    return ['type', 'commit', 'branch', 'status', 'component', 'error', 'message', 'sshUrl', 'org', 'bumpVersion'];
  }

  async list(limit, nextPageToken) {
    if (!limit) {
      limit = this.listLimit;
    }
    let query = this.store.createQuery(this.namespace, this.buildKind);
    query = query.order('created', {
      descending: true
    });
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    const [items, meta] = await this.store.runQuery(query);
    const entities = items ? items.map(this.fromDatastore.bind(this)) : [];
    const hasMore = meta.moreResults !== this.NO_MORE_RESULTS ? meta.endCursor : false;
    return [entities, hasMore];
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
      },
      {
        name: 'org',
        value: info.org,
        excludeFromIndexes: true
      }
    ];

    if (typeof info.bumpVersion === 'boolean') {
      results[results.length] = {
        name: 'bumpVersion',
        value: info.bumpVersion,
        excludeFromIndexes: true,
      };
    }

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

  async get(id) {
    const key = this.createBuildKey(id);
    const [entry] = await this.store.get(key);
    return this.fromDatastore(entry);
  }

  startBuild(id) {
    return this.updateBuildProperties(id, {
      status: 'running',
      startTime: Date.now()
    });
  }

  async restartBuild(id) {
    return this.updateBuildProperties(id, {
      status: 'queued',
      startTime: Date.now(),
      endTime: 0,
      message: '',
      error: false
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
