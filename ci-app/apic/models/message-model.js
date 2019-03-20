const {BaseModel} = require('./base-model');
/**
 * A model for catalog items.
 */
class MessageModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('ArcInfo');
  }

  get excludeIndexes() {
    return [
      'abstract', 'actionUrl', 'cta', 'title'
    ];
  }

  /**
   * Creates the datastore key with auto incremented id.
   * @return {Object} Datastore key
   */
  autoKey() {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.messageKind
      ]
    });
  }

  /**
   * Creates a datastore key for a component in a test.
   * @param {Number} messageId Message id
   * @return {Object} Datastore key
   */
  createMessageKey(messageId) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.messageKind,
        Number(messageId)
      ]
    });
  }

  /**
   * Creates a datastore query object with options.
   * @param {Object} config Query configuration options.
   * @return {Object} Datastore query object
   */
  _createQuery(config) {
    let query = this.store.createQuery(this.namespace, this.messageKind)
    .order('time', {
      descending: true
    });
    if (config.nextPageToken) {
      query = query.start(config.nextPageToken);
    } else {
      if (config.until) {
        query = query.filter('time', '<=', config.until);
      }
      if (config.since) {
        query = query.filter('time', '>=', config.since);
      }
    }
    if (config.target) {
      query = query.filter('target', '=', config.target);
    }
    if (config.channel) {
      query = query.filter('channel', '=', config.channel);
    }
    const limit = config.limit ? config.limit : this.listLimit;
    query = query.limit(limit);
    return query;
  }
  /**
   * Makes the query to the backend to retreive list or messages.
   * @param {Object} config Query options.
   * @return {Promise}
   */
  list(config) {
    const query = this._createQuery(config);
    return this.store.runQuery(query)
    .then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }

  /**
   * Insets new message to the datastore.
   * @param {Object} message Message object
   * @return {Promise}
   */
  insert(message) {
    const key = this.autoKey();
    const results = [{
      name: 'abstract',
      value: message.abstract,
      excludeFromIndexes: true
    }, {
      name: 'title',
      value: message.abstract,
      excludeFromIndexes: true
    }, {
      name: 'time',
      value: Date.now(),
      excludeFromIndexes: false
    }];

    if (message.actionUrl) {
      results.push({
        name: 'actionUrl',
        value: message.actionUrl,
        excludeFromIndexes: true
      });
    }

    if (message.cta) {
      results.push({
        name: 'cta',
        value: message.cta,
        excludeFromIndexes: true
      });
    }

    if (message.target) {
      results.push({
        name: 'target',
        value: message.target,
        excludeFromIndexes: false
      });
    }

    if (message.channel) {
      results.push({
        name: 'channel',
        value: message.channel,
        excludeFromIndexes: false
      });
    }

    const entity = {
      key,
      data: results
    };
    return this.store.upsert(entity)
    .then(() => this.store.get(key))
    .then((entity) => this.fromDatastore(entity[0]));
  }

  get(messageId) {
    const key = this.createMessageKey(messageId);
    console.log(key);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        console.log(entity[0][this.store.KEY]);
        return this.fromDatastore(entity[0]);
      }
    });
  }

  delete(messageId) {
    const transaction = this.store.transaction();
    const key = this.createMessageKey(messageId);
    return transaction.run()
    .then(() => transaction.delete(key))
    .then(() => transaction.commit())
    .catch((cause) => {
      transaction.rollback();
      return Promise.reject(cause);
    });
  }
}

module.exports.MessageModel = MessageModel;
