import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './base-api';
import { ComponentModel } from '../models/component-model';
import { DependencyModel } from '../models/dependency-model';
import logging from '../lib/logging';

const router = express.Router();
export default router;
router.use(bodyParser.json());

class ComponentsApiRoute extends BaseApi {
  constructor() {
    super();
    this.model = new ComponentModel();
    this.dependencyModel = new DependencyModel();
  }

  _validateTagParameter(req) {
    let { tags } = req.query;
    if (!tags) {
      return;
    }
    const messages = [];
    if (!(tags instanceof Array)) {
      if (typeof tags === 'string') {
        req.query.tags = [tags];
      } else {
        messages.push('The tags query parameter should be an array.');
      }
    } else {
      const typeMissmatch = tags.some((item) => typeof item !== 'string');
      if (typeMissmatch) {
        messages.push(`Tag ${typeMissmatch} is not a string.`);
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  async listComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const tagError = this._validateTagParameter(req);
    if (tagError) {
      this.sendError(res, tagError);
      return;
    }
    let { limit, nextPageToken, tags, group } = req.query;
    try {
      const result = await this.model.queryComponents(limit, nextPageToken, {
        tags,
        group
      });
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

  _validateTimeRange(req) {
    let { since, until } = req.query;
    if (!since && !until) {
      return;
    }
    const messages = [];
    if (since && isNaN(since)) {
      messages.push('The since query parameter must be a number.');
    }
    if (until && isNaN(until)) {
      messages.push('The until query parameter must be a number.');
    }
    if (!messages.length && since && until) {
      if (since > until) {
        messages.push('The since query parameter cannot be greater than until.');
      }
      if (until < since) {
        messages.push('The until query parameter cannot be lower than since.');
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  _validateParentParameters(req) {
    let { group, component } = req.query;
    if (group && !component) {
      return 'The "component" parameter is required when "group" is used';
    }
    if (!group && component) {
      return 'The "group" parameter is required when "component" is used';
    }
  }

  async listVersions(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const tagError = this._validateTagParameter(req);
    if (tagError) {
      this.sendError(res, tagError);
      return;
    }
    const timeError = this._validateTimeRange(req);
    if (timeError) {
      this.sendError(res, timeError);
      return;
    }
    const groupError = this._validateParentParameters(req);
    if (groupError) {
      this.sendError(res, groupError);
      return;
    }
    let { limit, nextPageToken, tags, group, component, since, until } = req.query;
    try {
      const result = await this.model.queryVersions(limit, nextPageToken, {
        tags,
        group,
        component,
        since,
        until
      });
      const noDocs = req.query['skip-docs'];
      if (noDocs === 'true') {
        result[0].forEach((item) => {
          delete item.docs;
        });
      }
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

  async listParentComponents(req, res) {
    let { devDependencies } = req.query;
    const { componentId } = req.params;
    if (devDependencies === 'true') {
      devDependencies = true;
    } else {
      devDependencies = false;
    }
    try {
      const result = this.dependencyModel.listParentComponents(componentId, devDependencies);
      this.sendListResult([result], res);
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }

  async listDependencies(req, res) {
    const { componentId } = req.params;
    try {
      const data = await this.dependencyModel.get(componentId);
      if (data) {
        if (!data.dependencies) {
          data.dependencies = [];
        }
        if (!data.devDependencies) {
          data.devDependencies = [];
        }
        res.send(data);
      } else {
        this.sendError(res, 'Component not found', 404);
      }
    } catch (cause) {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    }
  }
}

const api = new ComponentsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listComponents'],
  ['/versions', 'listVersions'],
  ['/:componentId/dependees', 'listParentComponents'],
  ['/:componentId/dependencies', 'listDependencies']
]);
