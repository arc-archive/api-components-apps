const express = require('express');
const bodyParser = require('body-parser');
const { BaseApi } = require('./base-api');
const { ComponentModel } = require('../models/component-model');
const { DependencyModel } = require('../models/dependency-model');
const logging = require('../../lib/logging');

const router = express.Router();
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

  listComponents(req, res) {
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
    this.model
      .queryComponents(limit, nextPageToken, {
        tags,
        group
      })
      .then((result) => this.sendListResult(result, res))
      .catch((cause) => {
        console.error(cause);
        logging.error(cause);
        if (cause.code === 3) {
          this.sendError(res, 'Inavlid nextPageToken parameter');
          return;
        }
        this.sendError(res, cause.message, 500);
      });
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

  listVersions(req, res) {
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
    this.model
      .queryVersions(limit, nextPageToken, {
        tags,
        group,
        component,
        since,
        until
      })
      .then((result) => {
        const noDocs = req.query['skip-docs'];
        if (noDocs === 'true') {
          result[0].forEach((item) => {
            delete item.docs;
          });
        }
        return this.sendListResult(result, res);
      })
      .catch((cause) => {
        console.error(cause);
        logging.error(cause);
        if (cause.code === 3) {
          this.sendError(res, 'Inavlid nextPageToken parameter');
          return;
        }
        this.sendError(res, cause.message, 500);
      });
  }

  listParentComponents(req, res) {
    let { devDependencies } = req.query;
    const { componentId } = req.params;
    if (devDependencies === 'true') {
      devDependencies = true;
    } else {
      devDependencies = false;
    }
    this.dependencyModel
      .listParentComponents(componentId, devDependencies)
      .then((result) => this.sendListResult([result], res))
      .catch((cause) => {
        console.error(cause);
        logging.error(cause);
        if (cause.code === 3) {
          this.sendError(res, 'Inavlid nextPageToken parameter');
          return;
        }
        this.sendError(res, cause.message, 500);
      });
  }

  listDependencies(req, res) {
    const { componentId } = req.params;
    this.dependencyModel
      .get(componentId)
      .then((data) => {
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
      })
      .catch((cause) => {
        console.error(cause);
        logging.error(cause);
        if (cause.code === 3) {
          this.sendError(res, 'Inavlid nextPageToken parameter');
          return;
        }
        this.sendError(res, cause.message, 500);
      });
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
module.exports = router;
