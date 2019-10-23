import express from 'express';

const router = express.Router();
export default router;
// https://github.com/advanced-rest-client/arc-datastore/blob/master/routes/analytics.js
class AnalyticsRoute extends BaseApi {
  get allowedTypes() {
    return ['daily', 'weekly', 'monthly'];
  }

  get allowedScopes() {
    return ['users', 'sessions'];
  }

  queryCustom(req, res) {
    const scope = req.params.scope;
    if (this.allowedScopes.indexOf(scope) === -1) {
      return this.sendError(res, 400, 'Unknown path');
    }

    const start = req.query.start;
    const end = req.query.end;
  }
}

const api = new MeApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/query/custom/:scope', 'queryCustom'],
  ['/query/:type/:scope', 'query'],
  ['/record', 'record', 'post']
]);
