const jwt = require('../../lib/jwt');
const { TokenModel } = require('../models/token-model');
const cors = require('cors');

let tokenModel;
class BaseApi {
  constructor() {
    this._processCors = this._processCors.bind(this);
  }
  /**
   * Sets CORS on all routes for `OPTIONS` HTTP method.
   * @param {Object} router Express app.
   */
  setCors(router) {
    router.options('*', cors(this._processCors));
  }
  /**
   * Shorthand function to register a route on this class.
   * @param {Object} router Express app.
   * @param {Array<Array<String>>} routes List of routes. Each route is an array
   * where:
   * - index `0` is the API route, eg, `/api/models/:modelId`
   * - index `1` is the function name to call
   * - index `2` is optional and describes HTTP method. Defaults to 'get'.
   * It must be lowercase.
   */
  wrapApi(router, routes) {
    for (let i = 0, len = routes.length; i < len; i++) {
      const route = routes[i];
      const method = route[2] || 'get';
      const clb = this[route[1]].bind(this);
      router[method](route[0], cors(this._processCors), clb);
    }
  }

  get tokenModel() {
    if (!tokenModel) {
      tokenModel = new TokenModel();
    }
    return tokenModel;
  }
  /**
   * Sends error to the client in a standarized way.
   * @param {Object} res HTTP response object
   * @param {String} message Error message to send.
   * @param {?Number} status HTTP status code, default to 400.
   */
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
      if (!token || token.revoked) {
        return false;
      }
      req.user = {
        id: token.issuer.id,
        displayName: token.issuer.displayName
      };
      return true;
    });
  }

  _processCors(req, callback) {
    const whitelist = [
      'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8081',
      'http://localhost:8082', 'http://127.0.0.1:8082', 'https://ci.advancedrestclient.com'
    ];
    const origin = req.header('Origin');
    let corsOptions;
    if (!origin) {
      corsOptions = { origin: false };
    } else if (origin.indexOf('http://localhost:') === 0 || origin.indexOf('http://127.0.0.1:') === 0) {
      corsOptions = { origin: true };
    } else if (whitelist.indexOf(origin) !== -1) {
      corsOptions = { origin: true };
    }
    if (corsOptions) {
      corsOptions.credentials = true;
      corsOptions.allowedHeaders = ['Content-Type', 'Authorization'];
      corsOptions.origin = origin;
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
    let { limit } = req.query;
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
