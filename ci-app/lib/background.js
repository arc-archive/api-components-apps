// Copyright 2018, Mulesoft.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';
const EventEmitter = require('events');
const {PubSub} = require('@google-cloud/pubsub');
const config = require('../config');
const logging = require('./logging');

class Background extends EventEmitter {
  constructor() {
    super();
    this.topicTestProcess = 'apic-tests';
    this.topicTestResult = 'apic-test-result';
    this.topicGhWebhook = 'apic-gh-webhook';

    this.subBuildWorker = 'ci-build-worker';
    this.subWorkerTestResult = 'ci-test-result';
    this.subGhCi = 'ci-gh-subscription';

    this.pubsub = new PubSub({
      projectId: config.get('GCLOUD_PROJECT')
    });
    this.subscriptions = [];
  }
  /**
   * Gets or creates Pub/Sub topic.
   * @param {String} name Topic name
   * @return {Promise<Topic>}
   */
  getTopic(name) {
    return this.pubsub.topic(name).get()
    .then((data) => data[0])
    .catch(() => {
      logging.verbose('Creating new topic ' + name);
      return this.pubsub.createTopic(name)
      .then((data) => data[0]);
    });
  }
  /**
   * Gets or creates subscription.
   * @param {Topic} topic Existing topic.
   * @param {String} name Subscription name.
   * @return {Promise<Subscription>}
   */
  getSubscription(topic, name) {
    return this.pubsub.subscription(name).get()
    .then((data) => data[0])
    .catch(() => {
      logging.verbose('Creating new subscription ' + name);
      return this.pubsub.createSubscription(topic, name, {
        pushConfig: undefined
      })
      .then((data) => data[0]);
    });
  }

  subscribe() {
    return this.getTopic(this.topicTestProcess)
    .then((topic) => this.getSubscription(topic, this.subBuildWorker))
    .then((subscription) => {
      subscription.on('message', this.handleMessage.bind(this, this.topicTestProcess));
      subscription.on('error', this.handleError.bind(this, this.topicTestProcess));
      logging.verbose('Subscribed to a topic: ' + this.topicTestProcess + ' with subscription ' + this.subBuildWorker);
      this.subscriptions.push(subscription);
    });
  }

  subscribeGithubBuild() {
    return this.getTopic(this.topicGhWebhook)
    .then((topic) => this.getSubscription(topic, this.subGhCi))
    .then((subscription) => {
      subscription.on('message', this.handleMessage.bind(this, this.topicGhWebhook));
      subscription.on('error', this.handleError.bind(this, this.topicGhWebhook));
      logging.verbose('Subscribed to a topic: ' + this.topicGhWebhook + ' with subscription ' + this.subGhCi);
      this.subscriptions.push(subscription);
    })
    .catch((cause) => {
      console.error(cause);
      throw cause;
    });
  }

  subscribeTestsResults() {
    return this.getTopic(this.topicTestResult)
    .then((topic) => this.getSubscription(topic, this.this.subWorkerTestResult))
    .then((subscription) => {
      subscription.on('message', this.handleMessage.bind(this, this.topicTestResult));
      subscription.on('error', this.handleError.bind(this, this.topicTestResult));
      logging.verbose('Subscribed to a topic: ' + this.topicTestResult +
        ' with subscription ' + this.subWorkerTestResult);
      this.subscriptions.push(subscription);
    });
  }

  handleMessage(topic, message) {
    message.ack();
    const data = JSON.parse(message.data);
    this.emit('message', topic, data);
  }

  handleError(topic, err) {
    this.emit('error', topic, err);
  }

  unsubscribe() {
    this.subscriptions.forEach((sub) => {
      sub.removeListeners('message');
      sub.removeListeners('error');
    });
    this.subscriptions = [];
  }

  publish(payload, topicName) {
    return this.getTopic(topicName)
    .then((topic) => {
      const publisher = topic.publisher();
      return publisher.publish(Buffer.from(JSON.stringify(payload)));
    })
    .then(() => {
      logging.info('Message published to topic ' + topicName);
    })
    .catch((cause) => {
      console.error(cause);
      logging.error('Error occurred while queuing background task', cause);
    });
  }
  /**
   * Queues a test to be performed by the worker
   * @param {String} id Datastore id of the test
   * @return {Promise}
   */
  queueTest(id) {
    const data = {
      action: 'runTest',
      id
    };
    return this.publish(data, this.topicTestProcess);
  }

  dequeueTest(id) {
    const data = {
      action: 'removeTest',
      id
    };
    return this.publish(data, this.topicTestProcess);
  }
  /**
   * Sends information to the background worker to queue a build
   * @param {String} id Build id
   * @return {Promise}
   */
  queueStageBuild(id) {
    const data = {
      action: 'process-build',
      id
    };
    return this.publish(data, this.topicGhWebhook);
  }
  /**
   * Sends information to the background worker to remove build from it's queue.
   * @param {String} id Build id
   * @return {Promise}
   */
  dequeueBuild(id) {
    const data = {
      action: 'remove-build',
      id
    };
    return this.publish(data, this.topicGhWebhook);
  }

  sendComponentTestResult(id, result) {
    const data = {
      action: 'component-test-result-ready',
      id,
      result
    };
    return this.publish(data, this.topicTestResult);
  }

  sendBuildingAmfStatus(id, status) {
    const data = {
      action: 'amd-building-status',
      id,
      status
    };
    return this.publish(data, this.topicTestResult);
  }

  sendTestError(id, message) {
    const data = {
      action: 'test-running-error',
      id,
      message
    };
    return this.publish(data, this.topicTestResult);
  }

  sendTestFinished(id, result) {
    const data = {
      action: 'test-running-finished',
      id,
      result
    };
    return this.publish(data, this.topicTestResult);
  }
}

const instance = new Background();
module.exports = instance;
