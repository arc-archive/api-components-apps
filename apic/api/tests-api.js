const {BaseApi} = require('./base-api');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const {TestsModel} = require('../models/test-model');
const {TestsComponentModel} = require('../models/test-component-model');
const {TestsLogsModel} = require('../models/test-logs-model');

const router = express.Router();
router.use(bodyParser.json());

class TestApiRoute extends BaseApi {
  constructor() {
    super();
    this.testModel = new TestsModel();
    this.testsComponentModel = new TestsComponentModel();
    this.testsLogsModel = new TestsLogsModel();
  }

  validateCreateTest(req) {
    const messages = [];
    const body = req.body;
    if (!body.type) {
      messages[messages.length] = 'Test "type" is required.';
    } else if (['amf-build', 'bottom-up'].indexOf(body.type) === -1) {
      messages[messages.length] = `"${body.type}" is not valid value for "type" property.`;
    }
    if (!body.branch) {
      messages[messages.length] = 'The "branch" property is required.';
    }
    if (body.type === 'amf-build' && body.component) {
      messages[messages.length] = 'The "component" property cannot be used with "amf-build" type.';
    }
    if (body.type === 'bottom-up' && !body.component) {
      messages[messages.length] = 'The "component" property is required with "bottom-up" type.';
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  validatePagination(req) {
    const messages = [];
    let {limit} = req.query;
    if (limit) {
      if (isNaN(limit)) {
        messages[messages.length] = 'Limit value is not a number';
      }
      limit = Number(limit);
      if (limit > 300 || limit < 0) {
        messages[messages.length] = 'Limit out of bounds [0, 300]';
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  createTest(req, res) {
    return this.isValidAccess(req, 'delete-test')
    .then((hasAccess) => {
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401
        };
        throw o;
      }
      const errors = this.validateCreateTest(req);
      if (errors) {
        const o = {
          message: errors,
          status: 400
        };
        throw o;
      }
      const body = req.body;
      const info = {
        branch: body.branch,
        type: body.type,
      };
      if (body.commit) {
        info.commit = body.commit;
      }
      if (body.component) {
        info.component = body.component;
      }
      return this.testModel.insertTest(info);
    })
    .then((testId) => {
      res.send({id: testId});
    })
    .catch((cause) => {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    });
  }

  listTest(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let {limit, nextPageToken} = req.query;
    this.testModel.listTests(limit, nextPageToken)
    .then((result) => this._sendListResult(result, res))
    .catch((cause) => {
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getTest(req, res) {
    const {testId} = req.params;
    this.testModel.getTest(testId)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test not found', 404);
      }
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
    });
  }

  deleteTest(req, res) {
    const {testId} = req.params;
    return this.isValidAccess(req, 'delete-test')
    .then((hasAccess) => {
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401
        };
        throw o;
      }
      return this.testModel.getTest(testId);
    })
    .then((resource) => {
      if (!resource) {
        const o = {
          message: 'Test not found',
          status: 404
        };
        throw o;
      }
      if (resource.status !== 'queued') {
        const o = {
          message: 'Test can be removed only when its state is queued',
          status: 400
        };
        throw o;
      }
      return this.testModel.deleteTest(testId);
    })
    .then(() => {
      res.sendStatus(204).end();
    })
    .catch((cause) => {
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    });
  }

  listTestComponents(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const {testId} = req.params;
    let {limit, nextPageToken} = req.query;
    this.testsComponentModel.list(testId, limit, nextPageToken)
    .then((result) => this._sendListResult(result, res))
    .catch((cause) => {
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getTestComponent(req, res) {
    const {testId, componentName} = req.params;
    this.testsComponentModel.get(testId, componentName)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test component not found', 404);
      }
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
    });
  }

  listLogs(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const {testId, componentName} = req.params;
    let {limit, nextPageToken} = req.query;
    this.testsLogsModel.list(testId, componentName, limit, nextPageToken)
    .then((result) => this._sendListResult(result, res))
    .catch((cause) => {
      if (cause.code === 3) {
        this.sendError(res, 'Inavlid nextPageToken parameter');
        return;
      }
      this.sendError(res, cause.message, 500);
    });
  }

  getLog(req, res) {
    const {testId, componentName, logId} = req.params;
    this.testsLogsModel.get(testId, componentName, logId)
    .then((resource) => {
      if (resource) {
        res.send(resource);
      } else {
        this.sendError(res, 'Test log not found', 404);
      }
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
    });
  }

  _sendListResult(result, res) {
    const data = {
      items: result[0]
    };
    if (result[1]) {
      data.nextPageToken = result[1];
    }
    res.send(data);
  }
}

const api = new TestApiRoute();

const checkCorsFn = api.processCors.bind(api);
router.options('*', cors(checkCorsFn));
router.post('/', cors(checkCorsFn), api.createTest.bind(api));
router.get('/', cors(checkCorsFn), api.listTest.bind(api));
router.get('/:testId', cors(checkCorsFn), api.getTest.bind(api));
router.delete('/:testId', cors(checkCorsFn), api.deleteTest.bind(api));
router.get('/:testId/components', cors(checkCorsFn), api.listTestComponents.bind(api));
router.get('/:testId/components/:componentName', cors(checkCorsFn), api.getTestComponent.bind(api));
router.get('/:testId/components/:componentName/logs', cors(checkCorsFn), api.listLogs.bind(api));
router.get('/:testId/components/:componentName/logs/:logId', cors(checkCorsFn), api.getLog.bind(api));

module.exports = router;
