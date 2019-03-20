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
    this.listLimit = 25;
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

  get versionsKind() {
    return 'Version';
  }

  get groupsKind() {
    return 'Group';
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

  get buildKind() {
    return 'Build';
  }

  get messageKind() {
    return 'Messages';
  }

  get dependencyKind() {
    return 'Dependency';
  }

  get apicUsersNamespace() {
    return 'api-components-users';
  }

  get apicTestsNamespace() {
    return 'api-components-tests';
  }

  get buildsNamespace() {
    return 'api-components-builds';
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
    const key = obj[this.store.KEY];
    obj.id = key.name || key.id;
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
  /**
   * Creates a datastore key for a build.
   * @param {String} id Build id
   * @return {Object} Datastore key
   */
  createBuildKey(id) {
    return this.store.key({
      namespace: this.buildsNamespace,
      path: [
        this.buildKind,
        id
      ]
    });
  }
}

module.exports.BaseModel = BaseModel;
