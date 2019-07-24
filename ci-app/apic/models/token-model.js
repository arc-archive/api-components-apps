const { BaseModel } = require('./base-model');

class TokenModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-users');
  }
  /**
   * Finds a token in the data store.
   * @param {String} token token
   * @return {Promise<Object>} Promise resolved to the token or undefined if the
   * token is not in the data store.
   */
  find(token) {
    let query = this.store.createQuery(this.namespace, this.tokenKind);
    query = query.filter('token', '=', token);
    query = query.limit(1);
    return this.store.runQuery(query).then((result) => {
      const token = result[0] && result[0][0];
      if (!token) {
        return;
      }
      return this.fromDatastore(token);
    });
  }
}

module.exports.TokenModel = TokenModel;
