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
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace
    });
  }

  get NO_MORE_RESULTS() {
    return Datastore.NO_MORE_RESULTS;
  }

  get testKind() {
    return 'Test';
  }

  get componentsKind() {
    return 'Component';
  }

  get testLogsKind() {
    return 'TestComponentLogs';
  }

  get userKind() {
    return 'User';
  }

  get tokenKind() {
    return 'Jwt';
  }

  get apicUsersNamespace() {
    return 'api-components-users';
  }

  get apicTestsNamespace() {
    return 'api-components-tests';
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

  createTestLogKey(testId, componentName, id) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.testKind,
        testId,
        this.componentsKind,
        this.slug(componentName),
        this.testLogsKind,
        id
      ]
    });
  }
}

module.exports.BaseModel = BaseModel;
