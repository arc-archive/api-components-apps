import express from 'express';
import bodyParser from 'body-parser';
import { BaseApi } from './base-api';
import { AnalyticsModel } from '../models/analytics-model.js';
import logging from '../lib/logging';

const router = express.Router();
export default router;
router.use(bodyParser.json());

class AnalyticsRoute extends BaseApi {
  get allowedTypes() {
    return ['daily', 'weekly', 'monthly'];
  }

  get allowedScopes() {
    return ['users', 'sessions'];
  }

  constructor() {
    super();
    this.model = new AnalyticsModel();
  }
  /**
   * Validates date format and range for the given type.
   *
   * Daily type needs to be a date in the past (before today).
   * Weekly type needs to be date + 7 days in the past. Also it will adjust
   * date to last Monday
   * (first day of week) if the date is not pointing to Monday.
   * Monthly have to be date adjusted to first day of month + last day of month
   * in the past.
   *
   * @param {String} type Either daily, weekly or monthly.
   * @param {String} date The query start date
   * @return {Array<Number>} In order, start and end date
   * @throws TypeError On the date validation error.
   */
  validateDate(type, date) {
    if (!date) {
      throw new TypeError('The date parameter is required for this method.');
    }

    let time = Date.parse(date);
    if (time !== time) {
      let error = 'The date parameter has invalid format. ';
      error = 'Accepted format is "YYYY-MM-dd".';
      throw new TypeError(error);
    }
    // Today minimum date to check if start date is in future.
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Start day's minimum
    let startCalendar = new Date(time);

    const offset = startCalendar.getTimezoneOffset();
    if (offset !== 0) {
      time += (offset * 60 * 1000);
      startCalendar = new Date(time);
    }
    startCalendar.setHours(0);
    startCalendar.setMinutes(0);
    startCalendar.setSeconds(0);
    startCalendar.setMilliseconds(0);

    if (today.getTime() <= startCalendar.getTime()) {
      throw new TypeError('The date parameter must be before today.');
    }

    let endCalendar;
    if (type === 'daily') {
      endCalendar = new Date(startCalendar.getTime());
    } else if (type === 'weekly') {
      // set previous monday if current date is not a Monday
      let day = startCalendar.getDay();
      let firstDayOfWeek = 1;
      while (day !== firstDayOfWeek) {
        // subtract day
        startCalendar.setTime(startCalendar.getTime() - 86400000);
        day = startCalendar.getDay();
      }
      endCalendar = new Date(startCalendar.getTime());
      // 6 * 86400000 - add 6 days
      endCalendar.setTime(endCalendar.getTime() + 518400000);
    } else if (type === 'monthly') {
      startCalendar.setDate(1); // first day of month
      endCalendar = new Date(startCalendar.getTime());
      endCalendar.setMonth(endCalendar.getMonth() + 1);
      // day earlier is the last day of month.
      endCalendar.setTime(endCalendar.getTime() - 86400000);
    }

    endCalendar.setDate(endCalendar.getDate() + 1); // midnight next day
    // substract one millisecond to have last millisecond of
    // the last daty of date range
    endCalendar.setMilliseconds(-1);
    if (today.getTime() <= endCalendar.getTime()) {
      let message = 'The date end range must be before today. Date range ends ';
      message += endCalendar.getFullYear() + '-';
      message += (endCalendar.getMonth() + 1) + '-';
      message += endCalendar.getDate();
      throw new TypeError(message);
    }
    return [startCalendar.getTime(), endCalendar.getTime()];
  }

  getDatePast(date) {
    if (!date) {
      throw new TypeError('Invalid parameter.');
    }

    let time = Date.parse(date);
    if (time !== time) {
      let error = 'The date parameter has invalid format. ';
      error = 'Accepted format is "YYYY-MM-dd".';
      throw new TypeError(error);
    }
    // Today minimum date to check if start date is in future.
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Start day's minimum
    let startCalendar = new Date(time);
    const offset = startCalendar.getTimezoneOffset();
    if (offset !== 0) {
      time += (offset * 60 * 1000);
      startCalendar = new Date(time);
    }
    startCalendar.setHours(0);
    startCalendar.setMinutes(0);
    startCalendar.setSeconds(0);
    startCalendar.setMilliseconds(0);

    if (today.getTime() <= startCalendar.getTime()) {
      throw new TypeError('The date parameter must be before today.');
    }

    return startCalendar;
  }

  sendQueryResults(res, data) {
    const [kind, result, items] = data;
    const obj = {
      kind
    };
    if (items) {
      obj.result = result;
      obj.items = items;
    } else {
      obj.items = result;
    }
    const body = JSON.stringify(obj, null, 2);
    res.set('Content-Type', 'application/json');
    res.status(200).send(body);
  }

  async queryCustom(req, res) {
    const scope = req.params.scope;
    if (this.allowedScopes.indexOf(scope) === -1) {
      return this.sendError(res, 'Unknown path', 400);
    }

    const start = req.query.start;
    const end = req.query.end;
    try {
      const startDate = this.getDatePast(start);
      const endDate = this.getDatePast(end);
      let fn = 'queryCustomRange';
      fn += scope[0].toUpperCase();
      fn += scope.substr(1);
      const result = await this.model[fn](startDate.getTime(), endDate.getTime());
      if (!result) {
        // not yet ready
        this.sendError(res, 'Not yet computed.', 404);
      } else {
        this.sendQueryResults(res, result);
      }
    } catch (e) {
      this.sendError(res, e.message, 400);
    }
  }

  async query(req, res) {
    const type = req.params.type;
    const scope = req.params.scope;

    if (this.allowedTypes.indexOf(type) === -1 ||
      this.allowedScopes.indexOf(scope) === -1) {
      this.sendError(res, 'Unknown path', 400);
      return;
    }

    const date = req.query.date;
    try {
      const [start, end] = this.validateDate(type, date);
      const result = await this._runQueryService(type, scope, start, end);
      if (!result) {
        // not yet ready
        this.sendError(res, 'Not yet computed.', 404);
      } else {
        this.sendQueryResults(res, result);
      }
    } catch (e) {
      logging.error(e);
      this.sendError(res, e.message, 400);
      return;
    }
  }

  async _runQueryService(type, scope, start, end) {
    let fn = 'query';
    fn += type[0].toUpperCase();
    fn += type.substr(1);
    fn += scope[0].toUpperCase();
    fn += scope.substr(1);

    return await this.model[fn](start, end);
  }

  async record(req, res) {
    if (!req.body) {
      this.sendError(res, 'Body not present.', 400);
      return;
    }
    const tz = req.body.tz;
    const anonymousId = req.body.aid;

    let message = '';
    if (!anonymousId) {
      message += 'The `aid` (anonymousId) parameter is required. ';
    }
    if (!tz && tz !== 0) {
      message += 'The `tz` (timeZoneOffset) parameter is required.';
    }
    if (message) {
      this.sendError(res, message, 400);
      return;
    }
    const timeZoneOffset = Number(tz);
    if (timeZoneOffset !== timeZoneOffset) {
      this.sendError(res,
        `timeZoneOffset is invalid: ${tz}. Expecting integer.`, 400);
      return;
    }
    try {
      const result = await this.model.recordSession(anonymousId, timeZoneOffset);
      if (result instanceof Error) {
        throw result;
      }
      if (result) {
        res.status(204).end();
      } else {
        res.status(205).end();
      }
    } catch (e) {
      this.sendError(res, e.message, 500);
      logging.error(e);
    }
  }
}

const api = new AnalyticsRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/query/custom/:scope', 'queryCustom'],
  ['/query/:type/:scope', 'query'],
  ['/record', 'record', 'post']
]);
