import { BaseModel } from './base-model';
import dateFormat from './date-format';
/**
 * A model for catalog items.
 */
export class AnalyticsModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('analytics');
  }
  /**
   * Records user and user's session in analytics datastore.
   *
   * @param {String} applicationId The client generated Application ID.
   * @param {Number} timeZoneOffset Client's timezone offset.
   * @return {Promise} True if new session has been recorded or false if existing
   * session has been updated.
   */
  async recordSession(applicationId, timeZoneOffset) {
    let time = Date.now();
    time += timeZoneOffset;
    await this.ensureUserRecord(applicationId, time);
    return await this.ensureSession(applicationId, time);
  }
  /**
   * Ensures that the record in User entity group exists for given application ID.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Promise<Object>} Promise will resolve when there's a user object or if one hyas been
   * created.
   */
  async ensureUserRecord(applicationId, time) {
    let entity = await this.getActiveUser(applicationId, time);
    if (!entity) {
      entity = await this.createActiveUser(applicationId, time);
    };
    return entity;
  }
  /**
   * Gets existing record for the application ID.
   * It search for application id that has been recorded today.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Promise<Object>} Promise Will resolve to entity object or to null if not found.
   */
  async getActiveUser(applicationId, time) {
    const entryKey = this.getUserKey(applicationId, time);
    try {
      const [entry] = await this.store.get(entryKey);
      return entry;
    } catch (_) {
      return null;
    }
  }
  /**
   * Creates a user record for today.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Promise}
   */
  async createActiveUser(applicationId, time) {
    const entryKey = this.getUserKey(applicationId, time);
    return await this.store.upsert({
      key: entryKey,
      data: {
        appId: applicationId,
        day: Date.now()
      }
    });
  }
  /**
   * Generates a User group key based on the application ID.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Object}
   */
  getUserKey(applicationId, time) {
    time = time || Date.now();
    const entryStringKey = dateFormat(new Date(time), 'YYYYMMdd');
    return this.store.key({
      namespace: this.namespace,
      path: ['User', applicationId + '/' + entryStringKey]
    });
  }
  /**
   * Ensures that the user session exists in the datastore.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Promise<boolean>} If true then new session wass created and false if session already
   * existed in the datastore.
   */
  async ensureSession(applicationId, time) {
    const entity = await this.getActiveSession(applicationId, time);
    if (entity) {
      return await this.updateActiveSession(entity, time);
    }
    return await this.createActiveSession(applicationId, time);
  }
  /**
   * Gets a user session recorded in last 30 minutes.
   *
   * @param {String} applicationId Anonymized application ID.
   * @param {Number} time A timestamp of the day of the user visit.
   * @return {Promise<Object>} Promise resolved to an entity or to null if session not found.
   */
  async getActiveSession(applicationId, time) {
    const past = time - 1800000;
    const query = this.store.createQuery(this.namespace, 'Session')
      .filter('appId', '=', applicationId)
      .filter('lastActive', '>=', past)
      .order('lastActive', {
        descending: true
      })
      .limit(1);
    const [entities] = await this.store.runQuery(query);
    if (entities && entities.length) {
      return entities;
    }
    return null;
  }

  async updateActiveSession(entity, time) {
    entity.lastActive = time;
    await this.store.upsert(entity);
    return false;
  }

  async createActiveSession(applicationId, time) {
    const entryKey = this.store.key({
      namespace: this.namespace,
      path: ['Session']
    });
    const entity = {
      key: entryKey,
      data: {
        appId: applicationId,
        day: time,
        lastActive: time
      }
    };
    await this.store.save(entity);
    return true;
  }

  /**
   * Gets the computed number of users for given day
   *
   * @param {Number} time A timestamp of the day
   * @return {Promise}
   */
  async queryDailyUsers(time) {
    const key = this.store.key({
      namespace: this.namespace,
      path: ['DailyUsers', dateFormat(new Date(time), 'yyyy-MM-dd')]
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    return ['ArcAnalytics#DailyUsers', entity.users];
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param {Number} start A timestamp of the start day in the date range.
   * @param {Number} end A timestamp of the last day in the date range.
   * @return {Promise}
   */
  async queryWeeklyUsers(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM-dd');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['WeeklyUsers', day]
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailyUsers(start, end);
    return ['ArcAnalytics#WeeklyUsers', entity.users, items];
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the `MonthlyUsers` group
   * and `start` and `end` to query for days.
   *
   * @param {Number} start A timestamp of the start day in the date range.
   * @param {Number} end A timestamp of the last day in the date range.
   * @return {Promise}
   */
  async queryMonthlyUsers(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM');
    let key = this.store.key({
      namespace: this.namespace,
      path: ['MonthlyUsers', day]
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailyUsers(start, end);
    return ['ArcAnalytics#MonthlyUsers', entity.users, items];
  }

  async _queryDailyUsers(start, end) {
    const query = this.store.createQuery(this.namespace, 'DailyUsers')
      .filter('day', '>=', start)
      .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    let keySymbol = this.store.KEY;
    return entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.users
      };
    });
  }

  /**
   * Gets the computed number of sessions for given day
   *
   * @param {Number} time A timestamp of the day
   * @return {Promise}
   */
  async queryDailySessions(time) {
    const key = this.store.key({
      namespace: this.namespace,
      path: ['DailySessions', dateFormat(new Date(time), 'yyyy-MM-dd')]
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    return ['ArcAnalytics#DailySessions', entity.sessions];
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param {Number} start A timestamp of the start day in the date range.
   * @param {Number} end A timestamp of the last day in the date range.
   * @return {Promise}
   */
  async queryWeeklySessions(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM-dd');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['WeeklySessions', day]
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailySessions(start, end);
    return ['ArcAnalytics#WeeklySessions', entity.sessions, items];
  }

  /**
   * Gets the computed number of sessions for given month.
   * The function uses the `start` argument to get the data from the `MonthlySessions` group
   * and `start` and `end` to query for days.
   *
   * @param {Number} start A timestamp of the start day in the date range.
   * @param {Number} end A timestamp of the last day in the date range.
   * @return {Promise}
   */
  async queryMonthlySessions(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['MonthlySessions', day]
    });

    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailySessions(start, end);
    return ['ArcAnalytics#MonthlySessions', entity.sessions, items];
  }

  async _queryDailySessions(start, end) {
    const query = this.store.createQuery('analytics', 'DailySessions')
      .filter('day', '>=', start)
      .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    let keySymbol = this.store.KEY;
    return entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.sessions
      };
    });
  }

  async queryCustomRangeSessions(start, end) {
    const query = this.store.createQuery('analytics', 'DailySessions')
      .filter('day', '>=', start)
      .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    const keySymbol = this.store.KEY;
    const items = entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.sessions
      };
    });
    return ['ArcAnalytics#CutomRangeSessions', items];
  }

  async queryCustomRangeUsers(start, end) {
    const query = this.store.createQuery('analytics', 'DailyUsers')
      .filter('day', '>=', start)
      .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    const keySymbol = this.store.KEY;
    const items = entities.map((entity) => {
      let day = entity[keySymbol].name;
      return {
        day,
        items: entity.users
      };
    });
    return ['ArcAnalytics#CutomRangeUsers', items];
  }
}
