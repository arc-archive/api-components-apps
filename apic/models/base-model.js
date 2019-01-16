const Datastore = require('@google-cloud/datastore');
const decamelize = require('decamelize');
const slug = require('slug');
const config = require('../../config');
class BaseModel {
  /**
   * @param {String} namespace Datastore namespace to use with datastore requests.
   */
  constructor(namespace) {
    this.namespace = namespace;
    this.testKind = 'Test';
    this.componentsKind = 'Component';
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace
    });
  }

  get NO_MORE_RESULTS() {
    return Datastore.NO_MORE_RESULTS;
  }
  /**
   * Creates a slug from a string.
   *
   * @param {String} name Value to slug,
   * @return {String}
   */
  slug(name) {
    return slug(decamelize(name, '-'));
  }
  /**
   * Validates pagination parameetrs.
   * @param {Object} req Request
   * @return {String|undefined} Error message or undefined if valid.
   */
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
  /**
   * Translates from Datastore's entity format to
   * the format expected by the application.
   *
   * Datastore format:
   *    {
   *      key: [kind, id],
   *      data: {
   *        property: value
   *      }
   *    }
   *
   *  Application format:
   *    {
   *      id: id,
   *      property: value
   *    }
   * @param {Object} obj Datastore entry
   * @return {Object}
   */
  fromDatastore(obj) {
    obj.id = obj[this.store.KEY].name;
    return obj;
  }
  /**
   * Creates a datastore key for a test.
   * @param {String} testId Test id
   * @return {Object} Datastore key
   */
  createTestKey(testId) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId
      ]
    });
  }
  /**
   * Creates a datastore key for a component in a test.
   * @param {String} testId Test id
   * @param {String} componentName Component name
   * @return {Object} Datastore key
   */
  createTestComponentKey(testId, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId,
        this.componentsKind,
        this.slug(componentName)
      ]
    });
  }
}

module.exports.BaseModel = BaseModel;
