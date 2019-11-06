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
    const { tags } = req.query;
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
    const { limit, nextPageToken, tags, group } = req.query;
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
    const { since, until } = req.query;
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
    const { group, component } = req.query;
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
    const { limit, nextPageToken, tags, group, component, since, until } = req.query;
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
    const { component } = req.params;
    let { scope } = req.params;
    if (scope[0] !== '@') {
      scope = `@${scope}`;
    }
    if (devDependencies === 'true') {
      devDependencies = true;
    } else {
      devDependencies = false;
    }
    const componentId = `${scope}/${component}`;
    try {
      const result = await this.dependencyModel.listParentComponents(componentId, devDependencies);
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

  _processDependencies(type, items) {
    if (!items) {
      return [];
    }
    return items.map((item) => {
      item.development = type === 'development';
      item.production = type === 'production';
      delete item.devDependencies;
      delete item.dependencies;
      return item;
    });
  }

  async listDependencies(req, res) {
    const { component } = req.params;
    let { scope } = req.params;
    if (scope[0] !== '@') {
      scope = `@${scope}`;
    }
    // TODO (pawel): depdnency keys are created in an invalid way
    // const componentId = `${scope}/${component}`;
    const componentId = `${component}`;
    try {
      const data = await this.dependencyModel.get(componentId);
      if (data) {
        const result = [];
        if (data.dependencies) {
          data.dependencies.forEach((name) => {
            result.push({
              name,
              production: true
            });
          });
        }
        if (data.devDependencies) {
          data.devDependencies.forEach((name) => {
            result.push({
              name,
              development: true
            });
          });
        }
        this.sendListResult([result], res);
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
  ['/:scope/:component/dependees', 'listParentComponents'],
  ['/:scope/:component/dependencies', 'listDependencies']
]);
