const cors = require('cors');
const express = require('express');
const { BaseApi } = require('./base-api');
const jwt = require('../../lib/jwt');

const router = express.Router();

class TokenApiRoute extends BaseApi {
  processToken(req, res) {
    const { token } = req.query;
    if (!token) {
      this.sendError(res, 'Specify token to analyze.', 400);
      return;
    }
    jwt
      .verifyToken(token)
      .then((decoded) => {
        const info = {
          scopes: decoded.scopes,
          expires: new Date(decoded.exp * 1000)
        };
        res.send(info);
      })
      .catch((cause) => {
        this.sendError(res, cause.message, 400);
      });
  }
}

const api = new TokenApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/', cors(checkCorsFn), api.processToken.bind(api));

module.exports = router;
