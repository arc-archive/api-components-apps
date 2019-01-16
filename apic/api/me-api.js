const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const {BaseApi} = require('./base-api');
const {UserModel} = require('../models/user-model');
const jwt = require('../../lib/jwt');

const router = express.Router();
router.use(bodyParser.json());

class MeApiRoute extends BaseApi {
  constructor() {
    super();
    this.userModel = new UserModel();
  }

  getCurrentUser(req, res) {
    if (!req.user) {
      res.send({
        loggedIn: false
      });
    } else {
      const user = Object.assign({}, req.user);
      delete user.id;
      user.loggedIn = true;
      res.send(user);
    }
  }

  listUserTokens(req, res) {
    if (!this.canCreate(req)) {
      this.sendError(res, 'Unauthorized', 401);
      return;
    }
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let {limit, nextPageToken} = req.query;
    this.userModel.listTokens(req.user.id, limit, nextPageToken)
    .then((result) => {
      const now = Date.now() / 1000;
      result[0].forEach((item) => {
        item.expired = item.expires <= now;
      });
      this.sendListResult(result, res);
    })
    .catch((cause) => {
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  _validateTokenCreate(req) {
    const messages = [];
    const body = req.body;
    if (!body.scopes || !body.scopes.length) {
      messages[messages.length] = 'Token "scope" is required.';
    } else if (!jwt.areScopesValid(body.scopes)) {
      messages[messages.length] = `Scope "${body.scopes.join(', ')}" is invalid.`;
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  createUserToken(req, res) {
    if (!this.canCreate(req)) {
      this.sendError(res, 'Unauthorized', 401);
      return;
    }
    const message = this._validateTokenCreate(req);
    if (message) {
      this.sendError(res, message, 400);
      return;
    }
    const opts = {
      scopes: req.body.scopes
    };
    if (req.body.expiresIn) {
      opts.expiresIn = req.body.expiresIn;
    }
    const token = jwt.generateToken(req.user, opts);
    jwt.verifyToken(token)
    .then((info) => this.userModel.insertUserToken(req.user, info, token))
    .then((token) => {
      token.expired = false;
      res.send(token);
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
      return;
    });
  }

  getUserToken(req, res) {
    if (!this.canCreate(req)) {
      this.sendError(res, 'Unauthorized', 401);
      return;
    }
    const {token} = req.params;
    this.userModel.getToken(req.user.id, token)
    .then((resource) => {
      if (resource) {
        const now = Date.now() / 1000;
        resource.expired = resource.expires <= now;
        res.send(resource);
      } else {
        this.sendError(res, 'Token not found', 404);
      }
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
    });
  }

  deleteUserToken(req, res) {
    if (!this.canCreate(req)) {
      this.sendError(res, 'Unauthorized', 401);
      return;
    }
    const {token} = req.params;
    this.userModel.getToken(req.user.id, token)
    .then((resource) => {
      if (resource) {
        if (resource.issuer.id !== req.user.id) {
          this.sendError(res, 'Token can only be deleted by its owner', 401);
          return;
        }
        return this.userModel.deleteUserToken(req.user.id, token)
        .then(() => {
          res.sendStatus(204).end();
        })
        .catch((cause) => {
          this.sendError(res, cause.message, 500);
        });
      } else {
        this.sendError(res, 'Token not found', 404);
      }
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
    });
  }
}

const api = new MeApiRoute();

const checkCorsFn = api.processCors.bind(api);
router.get('/', cors(checkCorsFn), api.getCurrentUser.bind(api));
router.get('/tokens', cors(checkCorsFn), api.listUserTokens.bind(api));
router.post('/tokens', cors(checkCorsFn), api.createUserToken.bind(api));
router.get('/tokens/:token', cors(checkCorsFn), api.getUserToken.bind(api));
router.delete('/tokens/:token', cors(checkCorsFn), api.deleteUserToken.bind(api));

module.exports = router;
