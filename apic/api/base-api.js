const config = require('../../config');
class BaseApi {
  sendError(res, message, status) {
    res.status(status || 400).send({
      error: true,
      message
    });
  }

  /**
   * Tests whether the request has user session that is admin / org user or has
   * x-api-token included into request that matches the one on `config.json`
   * file or it was defined in env.
   * @param {Object} req
   * @return {Boolean}
   */
  canCreate(req) {
    const user = req.user;
    if (user && (user.orgUser || user.superUser)) {
      return true;
    }
    const token = req.get('x-api-token');
    if (token && token === config.get('CI_API_SECRET')) {
      return true;
    }
    return false;
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
