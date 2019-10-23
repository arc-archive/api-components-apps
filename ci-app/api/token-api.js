import cors from 'cors';
import express from 'express';
import { BaseApi } from './base-api';
import * as jwt from '../lib/jwt';

const router = express.Router();
export default router;

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
