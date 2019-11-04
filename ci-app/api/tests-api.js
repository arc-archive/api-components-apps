import { BaseApi } from './base-api';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import { TestsModel } from '../models/test-model';
import { TestsComponentModel } from '../models/test-component-model';
import { TestsLogsModel } from '../models/test-logs-model';
import logging from '../lib/logging';

const router = express.Router();
export default router;
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
    if (body.type === 'bottom-up' && !body.org) {
      messages[messages.length] = 'The "org" property is required with "bottom-up" type.';
    }
    if (body.component) {
      const cmp = String(body.component);
      if (cmp[0] !== '@') {
        messages[messages.length] = 'The "component" has no NPM scope.';
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }
  /**
   * Inserts a new test request to the data store.
   * The test is scheduled to be executed in the duture.
   * The model informs the worker about new work using Pub/Sub system.
   * @param {Object} req
   * @param {Object} res
   * @return {Promise}
   */
  async createTest(req, res) {
    try {
      const hasAccess = this.isValidAccess(req, 'create-test');
      if (!hasAccess) {
        this.sendError(res, 'Unauthorized', 401);
        return;
      }
      const errors = this.validateCreateTest(req);
      if (errors) {
        this.sendError(res, errors, 400);
        return;
      }
      const { body, user } = req;
      const info = {
        branch: body.branch,
        type: body.type
      };
      if (body.commit) {
        info.commit = body.commit;
      }
      if (body.component) {
        info.component = body.component;
      }
      if (body.org) {
        info.org = body.org;
      }
      if (body.includeDev) {
        info.includeDev = body.includeDev;
      }
      info.creator = {
        id: user.id,
        displayName: user.displayName || ''
      };
      const id = await this.testModel.insertTest(info);
      res.send({ id });
    } catch (cause) {
      logging.error(cause);
      const status = cause.status || 500;
      this.sendError(res, cause.message, status);
    }
  }

  listTest(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    let { limit, nextPageToken } = req.query;
    this.testModel
      .listTests(limit, nextPageToken)
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

  getTest(req, res) {
    const { testId } = req.params;
    this.testModel
      .getTest(testId)
      .then((resource) => {
        if (resource) {
          res.send(resource);
        } else {
          this.sendError(res, 'Test not found', 404);
        }
      })
      .catch((cause) => {
        logging.error(cause);
        this.sendError(res, cause.message, 500);
      });
  }

  deleteTest(req, res) {
    const { testId } = req.params;
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
        return this.testModel.deleteTest(testId);
      })
      .then(() => {
        res.sendStatus(204).end();
      })
      .catch((cause) => {
        logging.error(cause);
        const status = cause.status || 500;
        this.sendError(res, cause.message, status);
      });
  }
  /**
   * An edpoint to reset test state and re-run the test.
   * @param {Object} req
   * @param {Object} res
   */
  restartTest(req, res) {
    const { testId } = req.params;
    this.isValidAccess(req, 'create-test')
      .then((hasAccess) => {
        if (!hasAccess) {
          const o = {
            message: 'Unauthorized',
            status: 401
          };
          throw o;
        }
        return this.testModel.resetTest(testId);
      })
      .then(() => {
        res.sendStatus(204).end();
      })
      .catch((cause) => {
        logging.error(cause);
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
    const { testId } = req.params;
    let { limit, nextPageToken } = req.query;
    this.testsComponentModel
      .list(testId, limit, nextPageToken)
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

  getTestComponent(req, res) {
    const { testId, componentName } = req.params;
    this.testsComponentModel
      .get(testId, componentName)
      .then((resource) => {
        if (resource) {
          res.send(resource);
        } else {
          this.sendError(res, 'Test component not found', 404);
        }
      })
      .catch((cause) => {
        logging.error(cause);
        this.sendError(res, cause.message, 500);
      });
  }

  listLogs(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const { testId, componentName } = req.params;
    let { limit, nextPageToken } = req.query;
    this.testsLogsModel
      .list(testId, componentName, limit, nextPageToken)
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

  getLog(req, res) {
    const { testId, componentName, logId } = req.params;
    this.testsLogsModel
      .get(testId, componentName, logId)
      .then((resource) => {
        if (resource) {
          res.send(resource);
        } else {
          this.sendError(res, 'Test log not found', 404);
        }
      })
      .catch((cause) => {
        logging.error(cause);
        this.sendError(res, cause.message, 500);
      });
  }
}

const api = new TestApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/', cors(checkCorsFn), api.createTest.bind(api));
router.get('/', cors(checkCorsFn), api.listTest.bind(api));
router.get('/:testId', cors(checkCorsFn), api.getTest.bind(api));
router.delete('/:testId', cors(checkCorsFn), api.deleteTest.bind(api));
router.put('/:testId/restart', cors(checkCorsFn), api.restartTest.bind(api));
router.get('/:testId/components', cors(checkCorsFn), api.listTestComponents.bind(api));
router.get('/:testId/components/:componentName', cors(checkCorsFn), api.getTestComponent.bind(api));
router.get('/:testId/components/:componentName/logs', cors(checkCorsFn), api.listLogs.bind(api));
router.get('/:testId/components/:componentName/logs/:logId', cors(checkCorsFn), api.getLog.bind(api));
