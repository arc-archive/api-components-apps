import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './base-api';
import { UserModel } from '../models/user-model';
import * as jwt from '../lib/jwt';
import validator from 'validator';
import { ClientError } from './errors.js';

const router = express.Router();
export default router;
router.use(bodyParser.json());

class MeApiRoute extends BaseApi {
  constructor() {
    super();
    this.userModel = new UserModel();
  }

  getCurrentUser(req, res) {
    this.isValidAccess(req)
        .then((hasAccess) => {
          if (hasAccess) {
            return this.userModel.getUser(req.user.id).then((user) => {
              if (!user) {
                res.send({
                  loggedIn: false
                });
              } else {
                user = Object.assign({}, user);
                delete user.id;
                user.loggedIn = true;
                res.send(user);
              }
            });
          } else {
            res.send({
              loggedIn: false
            });
          }
        })
        .catch((cause) => {
          const status = cause.status || 500;
          this.sendError(res, cause.message, status);
        });
  }

  listUserTokens(req, res) {
    return this.isValidAccess(req)
        .then((hasAccess) => {
          if (!hasAccess) {
            const o = {
              message: 'Unauthorized',
              status: 401
            };
            throw o;
          }
          const errors = this.validatePagination(req);
          if (errors) {
            const o = {
              message: errors,
              status: 400
            };
            throw o;
          }

          const { limit, nextPageToken } = req.query;
          return this.userModel.listTokens(req.user.id, limit, nextPageToken);
        })
        .then((result) => {
          const now = Date.now();
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
          const status = cause.status || 500;
          this.sendError(res, cause.message, status);
        });
  }
  /**
   * Validates token create request parameters.
   * @param {Object} req The request object
   * @throws {ClientError} when has invalid parameters
   */
  _validateTokenCreate(req) {
    const messages = [];
    const body = req.body;
    if (!body.scopes || !body.scopes.length) {
      messages[messages.length] = 'Token "scope" is required.';
    } else if (!jwt.areScopesValid(body.scopes)) {
      messages[messages.length] = `Scope "${body.scopes.join(', ')}" is invalid.`;
    }
    if (messages.length) {
      throw new ClientError(messages.join(' '));
    }
  }

  async createUserToken(req, res) {
    try {
      await this.ensureAccess(req);
      this._validateTokenCreate(req);
      const opts = {
        scopes: req.body.scopes
      };
      if (req.body.expiresIn) {
        opts.expiresIn = req.body.expiresIn;
      }
      const token = jwt.generateToken(req.user, opts);
      const info = await jwt.verifyToken(token);
      const name = req.body.name ? validator.escape(req.body.name) : undefined;
      const result = await this.userModel.insertUserToken(req.user, info, token, name);
      result.expired = false;
      res.send(result);
    } catch (cause) {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  getUserToken(req, res) {
    return this.isValidAccess(req)
        .then((hasAccess) => {
          if (!hasAccess) {
            const o = {
              message: 'Unauthorized',
              status: 401
            };
            throw o;
          }
          const { token } = req.params;
          return this.userModel.getToken(req.user.id, token);
        })
        .then((resource) => {
          if (resource) {
            resource.expired = resource.expires <= Date.now();
            res.send(resource);
          } else {
            this.sendError(res, 'Token not found', 404);
          }
        })
        .catch((cause) => {
          const status = cause.status || 500;
          this.sendError(res, cause.message, status);
        });
  }

  deleteUserToken(req, res) {
    const { token } = req.params;
    return this.isValidAccess(req)
        .then((hasAccess) => {
          if (!hasAccess) {
            const o = {
              message: 'Unauthorized',
              status: 401
            };
            throw o;
          }
          return this.userModel.getToken(req.user.id, token);
        })
        .then((resource) => {
          if (resource) {
            if (resource.issuer.id !== req.user.id) {
              this.sendError(res, 'Token can only be deleted by its owner', 401);
              return;
            }
            return this.userModel
                .deleteUserToken(req.user.id, token)
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
          const status = cause.status || 500;
          this.sendError(res, cause.message, status);
        });
  }

  revokeUserToken(req, res) {
    const { token } = req.params;
    return this.isValidAccess(req)
        .then((hasAccess) => {
          if (!hasAccess) {
            const o = {
              message: 'Unauthorized',
              status: 401
            };
            throw o;
          }
          return this.userModel.getToken(req.user.id, token);
        })
        .then((resource) => {
          if (resource) {
            if (resource.issuer.id !== req.user.id) {
              this.sendError(res, 'Token can only be deleted by its owner', 401);
              return;
            }
            return this.userModel
                .revokeUserToken(req.user.id, token)
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
          const status = cause.status || 500;
          this.sendError(res, cause.message, status);
        });
  }
}
// const checkCorsFn = api.processCors.bind(api);
// router.options('*', cors(checkCorsFn));
// router.get('/', cors(checkCorsFn), api.getCurrentUser.bind(api));
// router.get('/tokens', cors(checkCorsFn), api.listUserTokens.bind(api));
// router.post('/tokens', cors(checkCorsFn), api.createUserToken.bind(api));
// router.get('/tokens/:token', cors(checkCorsFn), api.getUserToken.bind(api));
// router.delete('/tokens/:token', cors(checkCorsFn), api.deleteUserToken.bind(api));
// router.post('/tokens/:token/revoke', cors(checkCorsFn), api.revokeUserToken.bind(api));

const api = new MeApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'getCurrentUser'],
  ['/tokens', 'listUserTokens'],
  ['/tokens', 'createUserToken', 'post'],
  ['/tokens/:token', 'getUserToken', 'delete'],
  ['/tokens/:token', 'deleteUserToken'],
  ['/tokens/:token/revoke', 'revokeUserToken', 'post']
]);
