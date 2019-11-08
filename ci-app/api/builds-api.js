import express from 'express';
import { BaseApi } from './base-api';
import { ComponentBuildModel } from '../models/component-build-model';
import logging from '../lib/logging';
import background from '../lib/background';

const router = express.Router();
export default router;

class BuildsApiRoute extends BaseApi {
  constructor() {
    super();
    this.model = new ComponentBuildModel();
  }

  async listBuilds(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { limit, nextPageToken } = req.query;
    try {
      const result = await this.model.list(limit, nextPageToken);
      this.sendListResult(result, res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  async getBuild(req, res) {
    const { id } = req.params;
    try {
      const resource = await this.model.get(id);
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Build not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    }
  }

  async restartBuild(req, res) {
    const { id } = req.params;
    try {
      await this.ensureAccess(req, 'restart-build');
      await this.model.restartBuild(id);
      background.queueStageBuild(id);
    } catch (cause) {
      logging.error(cause);
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }
}

const api = new BuildsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listBuilds'],
  ['/:id', 'getBuild'],
  ['/:id/restart', 'restartBuild', 'put'],
]);
