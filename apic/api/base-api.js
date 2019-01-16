const jwt = require('../../lib/jwt');
const {TokenModel} = require('../models/token-model');

let tokenModel;
class BaseApi {
  get tokenModel() {
    if (!tokenModel) {
      tokenModel = new TokenModel();
    }
    return tokenModel;
  }

  sendError(res, message, status) {
    res.status(status || 400).send({
      error: true,
      message
    });
  }
  /**
   * Tests whether the request has user session that is admin / org user or has
   * authorization header with valid JWT.
   * @param {Object} req
   * @param {?String} scope
   * @return {Promise<Boolean>}
   */
  isValidAccess(req, scope) {
    const user = req.user;
    if (user && (user.orgUser || user.superUser)) {
      return Promise.resolve(true);
    }
    const auth = req.get('authorization');
    if (!auth) {
      return Promise.resolve(false);
    }
    if (!String(auth).toLowerCase().startsWith('bearer ')) {
      return Promise.resolve(false);
    }
    const token = auth.substr(7);
    let detail;
    try {
      detail = jwt.verifyTokenSync(token);
    } catch (_) {
      return Promise.resolve(false);
    }
    if (jwt.isTokenExpired(detail)) {
      return Promise.resolve(false);
    }
    if (scope) {
      if (!jwt.hasScope(detail, 'all')) {
        if (!jwt.hasScope(detail, scope)) {
          return Promise.resolve(false);
        }
      }
    }
    return this.tokenModel.find(token)
    .catch(() => {})
    .then((token) => {
      if (!token) {
        return false;
      }
      req.user = {
        id: token.issuer.id,
        displayName: token.issuer.displayName
      };
      return true;
    });
  }

  processCors(req, callback) {
    const whitelist = ['http://localhost:8080', 'http://localhost:8081'];
    const origin = req.header('Origin');
    let corsOptions;
    if (!origin) {
      corsOptions = {origin: false};
    } else if (origin.indexOf('http://localhost:') === 0) {
      corsOptions = {origin: true};
    } else if (whitelist.indexOf(origin) !== -1) {
      corsOptions = {origin: true};
    }
    callback(null, corsOptions);
  }
  /**
   * Sends response as a list response.
   * @param {Array} result Response from the data model.
   * @param {Object} res HTTP resposne
   */
  sendListResult(result, res) {
    const data = {
      items: result[0]
    };
    if (result[1]) {
      data.nextPageToken = result[1];
    }
    res.send(data);
  }
  /**
   * Validates pagination parameters for variuos endpoints that result with list of results.
   * @param {Object} req HTTP request
   * @return {String|undefined} Validation oerr message or undefined if valid.
   */
  validatePagination(req) {
    const messages = [];
    let {limit} = req.query;
    if (limit) {
      if (isNaN(limit)) {
        messages[messages.length] = 'Limit value is not a number';
      }
      limit = Number(limit);
      if (limit > 300 || limit < 0) {
        messages[messages.length] = 'Limit out of bounds [0, 300]';
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }
}

module.exports.BaseApi = BaseApi;
