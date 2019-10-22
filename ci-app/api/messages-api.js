import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './base-api';
import { MessageModel } from '../models/message-model';
import logging from '../lib/logging';

const router = express.Router();
export default router;
router.use(bodyParser.json());

class MessagesApiRoute extends BaseApi {
  constructor() {
    super();
    this.model = new MessageModel();
  }

  validatePagination(req) {
    let messages = super.validatePagination(req);
    if (messages) {
      messages = [messages];
    } else {
      messages = [];
    }
    let { nextPageToken, since, until } = req.query;
    if (!nextPageToken) {
      if (until) {
        until = Number(until);
        if (isNaN(until)) {
          messages.push('The "until" parameter is not a number.');
          until = undefined;
        }
      }
      if (since) {
        since = Number(since);
        if (isNaN(since)) {
          messages.push('The "since" parameter is not a number.');
          since = undefined;
        }
      }
      if (since && until && since > until) {
        messages.push('"since" cannot be higher than until.');
      }
      const now = Date.now();
      if (since && since > now) {
        messages.push('"since" cannot be timestamp in the future.');
      }
      if (until && until > now) {
        messages.push('"until" cannot be timestamp in the future.');
      }
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  collectQueryParameters(req) {
    const result = {};
    const { nextPageToken, since, until, target, channel, limit } = req.query;
    if (nextPageToken) {
      result.nextPageToken = nextPageToken;
    } else {
      if (since) {
        result.since = Number(since);
      }
      if (until) {
        result.until = Number(until);
      }
      if (target) {
        result.target = target;
      }
      if (channel) {
        result.channel = channel;
      }
    }
    if (limit) {
      result.limit = limit;
    }
    return result;
  }

  validateCreateMessage(req) {
    const { abstract, title, actionUrl, cta, target, channel } = req.body;
    const messages = [];

    if (!abstract) {
      messages.push('The "abstract" property is required.');
    } else if (typeof abstract !== 'string') {
      messages.push('The "abstract" property has invalid type.');
    }
    if (!title) {
      messages.push('The "title" property is required.');
    } else if (typeof title !== 'string') {
      messages.push('The "title" property has invalid type.');
    }
    if (actionUrl && !cta) {
      messages.push('The "cta" property is required when "actionUrl" is set.');
    }
    if (!actionUrl && cta) {
      messages.push('The "actionUrl" property is required when "cta" is set.');
    }
    if (actionUrl && typeof actionUrl !== 'string') {
      messages.push('The "actionUrl" property has invalid type.');
    }
    if (cta && typeof cta !== 'string') {
      messages.push('The "cta" property has invalid type.');
    }
    if (channel && typeof channel !== 'string') {
      messages.push('The "channel" property has invalid type.');
    }
    if (target && !(target instanceof Array)) {
      messages.push('The "target" property has to be an array.');
    } else if (target && target instanceof Array) {
      target.forEach((item) => {
        if (typeof item !== 'string') {
          messages.push(`Target value ${item} is not a string.`);
        }
      });
    }
    return messages.length ? messages.join(' ') : undefined;
  }

  listMessages(req, res) {
    const errors = this.validatePagination(req);
    if (errors) {
      this.sendError(res, errors);
      return;
    }
    const params = this.collectQueryParameters(req);
    this.model
      .list(params)
      .then((result) => {
        if (result[0]) {
          result[0].forEach((item) => {
            item.kind = 'ArcInfo#Message';
          });
        }
        this.sendListResult(result, res);
      })
      .catch((cause) => {
        logging.error(cause);
        if (cause.code === 3) {
          this.sendError(res, 'Inavlid nextPageToken parameter');
          return;
        }
        this.sendError(res, cause.message, 500);
      });
  }

  createMesage(req, res) {
    return this.isValidAccess(req, 'create-message')
      .then((hasAccess) => {
        if (!hasAccess) {
          const o = {
            message: 'Unauthorized',
            status: 401
          };
          throw o;
        }

        const errors = this.validateCreateMessage(req);
        if (errors) {
          const o = {
            message: errors,
            status: 400
          };
          throw o;
        }

        const body = req.body;
        const info = {
          abstract: body.abstract,
          title: body.title
        };
        if (body.actionUrl) {
          info.actionUrl = body.actionUrl;
        }
        if (body.cta) {
          info.cta = body.cta;
        }
        if (body.target && body.target.length) {
          info.target = body.target;
        }
        if (body.channel) {
          info.channel = body.channel;
        }
        return this.model.insert(info);
      })
      .then((message) => {
        message.kind = 'ArcInfo#Message';
        res.send(message);
      })
      .catch((cause) => {
        logging.error(cause);
        const status = cause.status || 500;
        this.sendError(res, cause.message, status);
      });
  }

  deleteMessage(req, res) {
    const { messageId } = req.params;
    return this.isValidAccess(req, 'delete-message')
      .then((hasAccess) => {
        if (!hasAccess) {
          const o = {
            message: 'Unauthorized',
            status: 401
          };
          throw o;
        }
        return this.model.get(messageId);
      })
      .then((resource) => {
        if (!resource) {
          const o = {
            message: 'Message not found',
            status: 404
          };
          throw o;
        }
        return this.model.delete(messageId);
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
}
const api = new MessagesApiRoute();
api.setCors(router);
api.wrapApi(router, [['/', 'listMessages'], ['/', 'createMesage', 'post'], ['/:messageId', 'deleteMessage', 'delete']]);
