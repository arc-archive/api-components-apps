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

import EventEmitter from 'events';
import { PubSub } from '@google-cloud/pubsub';
import config from '../config';
import logging from './logging';

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
  async getTopic(name) {
    try {
      const [topic] = await this.pubsub.topic(name).get();
      return topic;
    } catch (e) {
      logging.verbose(`Creating new topic ${name}`);
      const [topic] = await this.pubsub.createTopic(name);
      return topic;
    }
  }
  /**
   * Gets or creates Pub/Sub subscription.
   * @param {Topic} topic Existing topic.
   * @param {String} name Subscription name.
   * @return {Promise<Subscription>}
   */
  async getSubscription(topic, name) {
    try {
      const [subscription] = await this.pubsub.subscription(name).get();
      return subscription;
    } catch (e) {
      logging.verbose(`Creating new subscription ${name}`);
      const [subscription] = await this.pubsub.createSubscription(topic, name, {
        pushConfig: undefined
      });
      return subscription;
    }
  }

  async subscribe() {
    logging.info('PubSub: Subscribing to Tests topic.');
    const topic = await this.getTopic(this.topicTestProcess);
    const subscription = await this.getSubscription(topic, this.subBuildWorker);
    subscription.on('message', this.handleMessage.bind(this, this.topicTestProcess));
    subscription.on('error', this.handleError.bind(this, this.topicTestProcess));
    logging.verbose(
        'Subscribed to a topic: ' + this.topicTestProcess + ' with subscription ' + this.subBuildWorker
    );
    this.subscriptions.push(subscription);
  }

  async subscribeGithubBuild() {
    logging.info('PubSub: Subscribing to GitHub topic...');
      const topic = await this.getTopic(this.topicGhWebhook);
    const subscription = await this.getSubscription(topic, this.subGhCi);
    subscription.on('message', this.handleMessage.bind(this, this.topicGhWebhook));
    subscription.on('error', this.handleError.bind(this, this.topicGhWebhook));
    logging.verbose('Subscribed to a topic: ' + this.topicGhWebhook + ' with subscription ' + this.subGhCi);
    this.subscriptions.push(subscription);
    logging.info('PubSub: GitHub topic subscription ready.');
  }

  async subscribeTestsResults() {
    logging.info('PubSub: Subscribing to Test resultws topic.');
    const topic = await this.getTopic(this.topicTestResult);
    const subscription = await this.getSubscription(topic, this.subWorkerTestResult);
    subscription.on('message', this.handleMessage.bind(this, this.topicTestResult));
    subscription.on('error', this.handleError.bind(this, this.topicTestResult));
    logging.verbose(
        'Subscribed to a topic: ' + this.topicTestResult + ' with subscription ' + this.subWorkerTestResult
    );
    this.subscriptions.push(subscription);
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

  async publish(payload, topicName) {
    try {
      const topic = await this.getTopic(topicName);
      await topic.publisher.publish(Buffer.from(JSON.stringify(payload)));
      logging.info(`Message published to topic ${topicName}`);
    } catch (e) {
      logging.error('Error occurred while queuing background task', e);
    }
  }
  /**
   * Queues a test to be performed by the worker
   * @param {String} id Datastore id of the test
   * @return {Promise}
   */
  async queueTest(id) {
    const data = {
      action: 'runTest',
      id
    };
    await this.publish(data, this.topicTestProcess);
  }

  async dequeueTest(id) {
    const data = {
      action: 'removeTest',
      id
    };
    await this.publish(data, this.topicTestProcess);
  }
  /**
   * Sends information to the background worker to queue a build
   * @param {String} id Build id
   * @return {Promise}
   */
  async queueStageBuild(id) {
    const data = {
      action: 'process-build',
      id
    };
    await this.publish(data, this.topicGhWebhook);
  }
  /**
   * Sends information to the background worker to remove build from it's queue.
   * @param {String} id Build id
   * @return {Promise}
   */
  async dequeueBuild(id) {
    const data = {
      action: 'remove-build',
      id
    };
    await this.publish(data, this.topicGhWebhook);
  }

  async sendComponentTestResult(id, result) {
    const data = {
      action: 'component-test-result-ready',
      id,
      result
    };
    await this.publish(data, this.topicTestResult);
  }

  async sendBuildingAmfStatus(id, status) {
    const data = {
      action: 'amd-building-status',
      id,
      status
    };
    await this.publish(data, this.topicTestResult);
  }

  async sendTestError(id, message) {
    const data = {
      action: 'test-running-error',
      id,
      message
    };
    await this.publish(data, this.topicTestResult);
  }

  async sendTestFinished(id, result) {
    const data = {
      action: 'test-running-finished',
      id,
      result
    };
    await this.publish(data, this.topicTestResult);
  }
}
const instance = new Background();
export default instance;
