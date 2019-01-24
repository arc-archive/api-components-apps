const uuidv4 = require('uuid/v4');
const {BaseModel} = require('./base-model');

class UserModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-users');
  }

  get excludedIndexes() {
    return ['displayName', 'orgUser', 'superUser', 'imageUrl'];
  }

  get excludedIndexesToken() {
    return ['name', 'expires', 'issuer', 'scopes', 'revoked'];
  }

  get suEmails() {
    return ['jarrodek@gmail.com', 'pawel.psztyc@gmail.com', 'ppsztyc@salesforce.com'];
  }

  get orgDomains() {
    return ['@mulesoft.com', '@salesforce.com'];
  }

  /**
   * Creates a datastore key for a user.
   * @param {String} id OAuth returned user ID.
   * @return {Object} Datastore key
   */
  createUserKey(id) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.userKind,
        id
      ]
    });
  }

  /**
   * Creates a datastore key for a user's token.
   * @param {String} userId User ID.
   * @param {String} tokenId Token id.
   * @return {Object} Datastore key
   */
  createUserTokenKey(userId, tokenId) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.userKind,
        userId,
        this.tokenKind,
        tokenId
      ]
    });
  }
  /**
   * Lookups and returns user object.
   * @param {String} id User ID.
   * @return {Promise<Object>} User object or undefined if not found.
   */
  getUser(id) {
    const key = this.createUserKey(id);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
  /**
   * Checks emails returned from the response to determine whether the user
   * is organization user and therefore has create rights.
   * @param {Array<Object>} emails List of emails received from the OAuth response.
   * @return {Array<Boolean>} First item is whether the user is organization user and
   * second one is for me :) (PP)
   */
  _processUserPermissions(emails) {
    let superUser = false;
    let orgUser = false;
    const suEmails = this.suEmails;
    const domains = this.orgDomains;
    for (let i = 0; i < emails.length; i++) {
      if (orgUser) {
        break;
      }
      const info = emails[i];
      if (!info || !info.value || info.type !== 'account') {
        continue;
      }
      if (suEmails.indexOf(info.value) !== -1) {
        superUser = true;
        orgUser = true;
        break;
      }
      for (let j = 0, jLen = domains.length; j < jLen; j++) {
        if (info.value.indexOf(domains[i]) !== -1) {
          orgUser = true;
          break;
        }
      }
    }
    return [orgUser, superUser];
  }
  /**
   * Extracts profile information from OAuth2 response.
   * @param {Object} profile Profile data returned by Passport.
   * @return {Object} User model
   */
  extractOauthProfile(profile) {
    const emails = profile.emails || [];
    const [orgUser, superUser] = this._processUserPermissions(emails);
    let imageUrl = '';
    if (profile.photos && profile.photos.length) {
      imageUrl = profile.photos[0].value;
    }
    return {
      id: profile.id,
      displayName: profile.displayName || 'Unknown Name',
      orgUser,
      superUser,
      imageUrl
    };
  }
  /**
   * Creates a user.
   * @param {Object} profile Response from OAuth authentication from Passport.
   * @param {?String} refreshToken OAuth refresh token. Not required.
   * @return {Promise<String>} A promise resolved to user id.
   */
  createUser(profile, refreshToken) {
    const id = profile.id;
    const copy = this.extractOauthProfile(profile);
    const key = this.createUserKey(id);
    const results = [{
      name: 'displayName',
      value: copy.displayName,
      excludeFromIndexes: true
    }, {
      name: 'orgUser',
      value: copy.orgUser,
      excludeFromIndexes: true
    }, {
      name: 'superUser',
      value: copy.superUser,
      excludeFromIndexes: true
    }, {
      name: 'imageUrl',
      value: copy.imageUrl,
      excludeFromIndexes: true
    }, {
      name: 'tos', // terms of service
      value: false,
      excludeFromIndexes: true
    }];
    if (refreshToken) {
      results[results.length] = {
        name: 'refreshToken',
        value: refreshToken,
        excludeFromIndexes: true
      };
    }
    const entity = {
      key,
      data: results
    };
    return this.store.upsert(entity)
    .then(() => {
      return id;
    });
  }
  /**
   * Returns a user if already exists or creates new user and returns new profile.
   * @param {Object} profile Response from OAuth authentication from Passport.
   * @param {?String} refreshToken OAuth refresh token. Not required.
   * @return {Promise<Object>} Promise resolved to user profile info.
   */
  findOrCreateUser(profile, refreshToken) {
    return this.getUser(profile.id)
    .then((user) => {
      if (!user) {
        return this.createUser(profile, refreshToken).then(() => this.getUser(profile.id));
      }
      return user;
    });
  }
  /**
   * Lists all user generated tokens.
   * @param {String} userId User id
   * @param {?Number} limit Number of items in the response
   * @param {?String} nextPageToken Start page token
   * @return {Promise<Array>} Promise resolved to an array where first item is the
   * list of results and second is either `nextPageToken` or false.
   */
  listTokens(userId, limit, nextPageToken) {
    if (!limit) {
      limit = 25;
    }
    const ancestorKey = this.createUserKey(userId);
    let query = this.store.createQuery(this.namespace, this.tokenKind).hasAncestor(ancestorKey);
    query = query.limit(limit);
    query = query.order('created', {
      descending: true
    });
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    return this.store.runQuery(query)
    .then((result) => {
      const entities = result[0].map(this.fromDatastore.bind(this));
      const hasMore = result[1].moreResults !== this.NO_MORE_RESULTS ? result[1].endCursor : false;
      return [entities, hasMore];
    });
  }
  /**
   * Lookups and returns user token
   * @param {String} userId Owner id
   * @param {String} tokenId Token id
   * @return {Promise<Object>} A promise resolved to the token value or undefined.
   */
  getToken(userId, tokenId) {
    const key = this.createUserTokenKey(userId, tokenId);
    return this.store.get(key)
    .then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }
  /**
   * Creates new user token.
   * @param {Object} user Session user
   * @param {Object} tokenInfo Decrypted token info
   * @param {String} token The token
   * @param {?String} name Optional name for the token
   * @return {Promise<Object>} Promise resolved to the token object.
   */
  insertUserToken(user, tokenInfo, token, name) {
    const id = uuidv4();
    const key = this.createUserTokenKey(user.id, id);

    const results = [{
      name: 'token',
      value: token,
      excludeFromIndexes: false
    }, {
      name: 'scopes',
      value: tokenInfo.scopes,
      excludeFromIndexes: true
    }, {
      name: 'issuer',
      value: {
        id: user.id,
        displayName: user.displayName || ''
      },
      excludeFromIndexes: true
    }, {
      name: 'created',
      value: Date.now(),
      excludeFromIndexes: false
    }];
    if (tokenInfo.exp) {
      results[results.length] = {
        name: 'expires',
        value: tokenInfo.exp * 1000,
        excludeFromIndexes: true
      };
    }
    if (name) {
      results[results.length] = {
        name: 'name',
        value: name,
        excludeFromIndexes: true
      };
    }
    const entity = {
      key,
      data: results
    };
    return this.store.upsert(entity)
    .then(() => {
      return this.getToken(user.id, id);
    });
  }
  /**
   * Sets `revoked` status on a token.
   * @param {String} userId Owner id
   * @param {String} tokenId Token id
   * @return {Promise}
   */
  revokeUserToken(userId, tokenId) {
    const transaction = this.store.transaction();
    const key = this.createUserTokenKey(userId, tokenId);
    return transaction.run()
    .then(() => transaction.get(key))
    .then((data) => {
      const [token] = data;
      token.revoked = true;
      transaction.save({
        key,
        data: token,
        excludeFromIndexes: this.excludedIndexesToken
      });
      return transaction.commit();
    })
    .catch((cause) => {
      transaction.rollback();
      return Promise.reject(cause);
    });
  }

  deleteUserToken(userId, tokenId) {
    const key = this.createUserTokenKey(userId, tokenId);
    return this.store.delete(key);
  }
}

module.exports.UserModel = UserModel;
