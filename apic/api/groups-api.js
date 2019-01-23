const express = require('express');
const bodyParser = require('body-parser');
const {BaseApi} = require('./base-api');
const {ComponentModel} = require('../models/component-model');
const logging = require('../../lib/logging');

const router = express.Router();
router.use(bodyParser.json());

class GroupsApiRoute extends BaseApi {
  constructor() {
    super();
    this.model = new ComponentModel();
  }

  listGroups(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let {limit, nextPageToken} = req.query;
    this.model.listGroups(limit, nextPageToken)
    .then((result) => this.sendListResult(result, res))
    .catch((cause) => {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getGroup(req, res) {
    const {groupId} = req.params;
    this.model.getGroup(groupId)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    })
    .catch((cause) => {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    });
  }

  listGroupComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let {limit, nextPageToken} = req.query;
    const {groupId} = req.params;
    this.model.listComponents(limit, nextPageToken, groupId)
    .then((result) => this.sendListResult(result, res))
    .catch((cause) => {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getComponent(req, res) {
    const {groupId, componentId} = req.params;
    this.model.getComponent(groupId, componentId)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    })
    .catch((cause) => {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    });
  }

  listComponentVersions(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let {limit, nextPageToken} = req.query;
    const {groupId, componentId} = req.params;
    this.model.listVersions(groupId, componentId, limit, nextPageToken)
    .then((result) => this.sendListResult(result, res))
    .catch((cause) => {
      logging.error(cause);
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getVersion(req, res) {
    const {groupId, componentId, versionId} = req.params;
    this.model.getVersion(groupId, componentId, versionId)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Group not found', 404);
      }
    })
    .catch((cause) => {
      logging.error(cause);
      this.sendError(res, cause.message, 500);
    });
  }
}

const api = new GroupsApiRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/', 'listGroups'],
  ['/:groupId', 'getGroup'],
  ['/:groupId/components', 'listGroupComponents'],
  ['/:groupId/components/:componentId', 'getComponent'],
  ['/:groupId/components/:componentId/versions', 'listComponentVersions'],
  ['/:groupId/components/:componentId/versions/:versionId', 'getVersion']
]);
module.exports = router;
