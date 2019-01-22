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
    this.testProcessTopicName = config.get('TESTS_PROCESS_TOPIC_NAME');
    this.travisTopicName = config.get('TRAVIS_TOPIC_NAME');
    this.subscriptionName = config.get('SUBSCRIPTION_NAME');
    this.travisBuildsubscriptionName = config.get('TRAVIS_BUILD_SUBSCRIPTION_NAME');
    this.travisWebhookbscriptionName = config.get('TRAVIS_WEBHOOK_SUBSCRIPTION_NAME');
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
    return this.pubsub.getTopics()
    .then((response) => {
      const [topics] = response;
      let topic;
      for (let i = 0, len = (topics || []).length; i < len; i++) {
        if ((topics[i].name || '').indexOf('topics/' + name) !== -1) {
          topic = topics[i];
          break;
        }
      }
      if (topic) {
        return topic;
      }
      return this.pubsub.createTopic(name);
    })
    .then((data) => {
      return data instanceof Array ? data[0] : data;
    });
  }
  /**
   * Gets or creates subscription.
   * @param {Topic} topic Existing topic.
   * @param {String} name Topic name.
   * @return {Promise<Subscription>}
   */
  getSubscription(topic, name) {
    return this.pubsub.getSubscriptions(name)
    .then((subscriptions) => {
      const subscription = subscriptions[0] && subscriptions[0][0];
      if (!subscription) {
        logging.verbose('Creating subscription.');
        return this.pubsub.createSubscription(topic, this.subscriptionName);
      }
      logging.verbose('Using existing subscription');
      return subscription;
    });
  }

  subscribe() {
    const subscription = this.pubsub.subscription(this.subscriptionName);
    subscription.on('message', this.handleMessage.bind(this, this.testProcessTopicName));
    subscription.on('error', this.handleError.bind(this, this.testProcessTopicName));
  }

  subscribeTravisBuild() {
    const buildSub = this.travisBuildsubscriptionName;
    const webhookSub = this.travisWebhookbscriptionName;
    const top = this.travisTopicName;
    const subscription = this.pubsub.subscription(buildSub);
    subscription.on('message', this.handleTravisMessage.bind(this, top, buildSub));
    subscription.on('error', this.handleTravisError.bind(this, top, buildSub));
    this.subscriptions.push(subscription);
    const subscription2 = this.pubsub.subscription(webhookSub);
    subscription2.on('message', this.handleTravisMessage.bind(this, top, webhookSub));
    subscription2.on('error', this.handleTravisError.bind(this, top, webhookSub));
    this.subscriptions.push(subscription2);
  }

  handleMessage(topic, message) {
    message.ack();
    const data = JSON.parse(message.data);
    this.emit('message', topic, data);
  }

  handleError(topic, err) {
    this.emit('error', topic, err);
  }

  handleTravisMessage(topic, subscription, message) {
    message.ack();
    const data = JSON.parse(message.data);
    this.emit('travis-message', topic, subscription, data);
  }

  handleTravisError(topic, subscription, err) {
    this.emit('travis-error', topic, subscription, err);
  }

  unsubscribe() {
    if (this.subscription) {
      // Remove event listeners
      this.subscription.removeListeners('message');
      this.subscription.removeListeners('error');
      this.subscription = undefined;
    }
  }

  publish(payload, topicName) {
    return this.getTopic(topicName)
    .then((topic) => {
      const publisher = topic.publisher();
      return publisher.publish(Buffer.from(JSON.stringify(payload)));
    })
    .then(() => {
      logging.info(`Message published`);
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
    return this.publish(data, this.testProcessTopicName);
  }

  dequeueTest(id) {
    const data = {
      action: 'removeTest',
      id
    };
    return this.publish(data, this.testProcessTopicName);
  }

  sendTest(message) {
    const data = {
      action: 'test-print',
      message
    };
    return this.publish(data, this.testProcessTopicName);
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
    return this.publish(data, this.travisTopicName);
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
    return this.publish(data, this.travisTopicName);
  }
}

const instance = new Background();
module.exports = instance;
