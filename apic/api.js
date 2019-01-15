'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {TestsModel} = require('./models/test-model');
const {TestsComponentModel} = require('./models/test-component-model');
const {TestsLogsModel} = require('./models/test-logs-model');
const router = express.Router();
router.use(bodyParser.json());

class ApicApiRoute {
  constructor() {
    this.testModel = new TestsModel();
    this.testsComponentModel = new TestsComponentModel();
    this.testsLogsModel = new TestsLogsModel();
  }

  sendError(res, message, status) {
    res.status(status || 400).send({
      error: true,
      message
    });
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
    if (!req.user) {
      this.sendError(res, 'Not authorized', 401);
      return;
    }
    const errors = this.validateCreateTest(req);
    if (errors) {
      this.sendError(res, errors);
      return;
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
    this.testModel.insertTest(info)
    .then((testId) => {
      res.send({id: testId});
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
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
    if (!req.user) {
      this.sendError(res, 'Not authorized', 401);
      return;
    }
    const {testId} = req.params;
    let responded = false;
    this.testModel.getTest(testId)
    .then((resource) => {
      if (resource) {
        if (resource.status !== 'queued') {
          this.sendError(res, 'Test can be removed only when its state is queued', 400);
          responded = true;
        } else {
          return this.testModel.deleteTest(testId);
        }
      } else {
        this.sendError(res, 'Test not found', 404);
        responded = true;
      }
    })
    .then(() => {
      if (responded) {
        return;
      }
      res.sendStatus(204).end();
    })
    .catch((cause) => {
      this.sendError(res, cause.message, 500);
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

  processCors(req, callback) {
    const whitelist = ['http://localhost:8080', 'http://localhost:8081'];
    const origin = req.header('Origin');
    let corsOptions;
    if (!origin) {
      corsOptions = {origin: false};
    } else if (origin.indexOf('http://localhost:') === 0) {
      corsOptions = {origin: true};
    } else if (whitelist.indexOf(origin) !== -1) {
      corsOptions = {origin: true};
    }
    callback(null, corsOptions);
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
}

const api = new ApicApiRoute();

const checkCorsFn = api.processCors.bind(api);
router.options('*', cors(checkCorsFn));
router.post('/tests', cors(checkCorsFn), api.createTest.bind(api));
router.get('/tests', cors(checkCorsFn), api.listTest.bind(api));
router.get('/tests/:testId', cors(checkCorsFn), api.getTest.bind(api));
router.delete('/tests/:testId', cors(checkCorsFn), api.deleteTest.bind(api));
router.get('/tests/:testId/components', cors(checkCorsFn), api.listTestComponents.bind(api));
router.get('/tests/:testId/components/:componentName', cors(checkCorsFn), api.getTestComponent.bind(api));
router.get('/tests/:testId/components/:componentName/logs', cors(checkCorsFn), api.listLogs.bind(api));
router.get('/tests/:testId/components/:componentName/logs/:logId', cors(checkCorsFn), api.getLog.bind(api));
router.get('/me', cors(checkCorsFn), api.getCurrentUser.bind(api));

// Errors
router.use((err, req, res) => {
  console.log('ERROR API HANDLER');
  res.send({error: err.message});
});

module.exports = router;
