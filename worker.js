'use strict';

// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent');
}

const express = require('express');
const config = require('./config');
const logging = require('./lib/logging');
const {ComponentModel} = require('./apic/models/component-model');
const {TestsModel} = require('./apic/models/test-model');
const {ApicTestRunner} = require('./apic/test-runner');
const background = require('./lib/background');


// When running on Google App Engine Managed VMs, the worker needs
// to respond to HTTP requests and can optionally supply a health check.
const app = express();

app.use(logging.requestLogger);

app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});

class ApiComponentsTestsWorker {
  constructor() {
    this.testCount = 0;
    this.lastRunTime = 0;
    this.lastEndTime = 0;
    this.catalogModel = new ComponentModel();
    this.testsModel = new TestsModel();
    this.queue = [];
    this._onMessage = this._onMessage.bind(this);
    this._onError = this._onError.bind(this);
  }

  /**
   * Subscribe to Cloud Pub/Sub and receive messages to process tests requests.
   *
   * @return {Promise}
   */
  subscribe() {
    background.on('message', this._onMessage);
    background.on('error', this._onError);
    return background.subscribe();
  }

  _onMessage(topic, data) {
    switch (data.action) {
      case 'runTest': this.runTest(data.id); break;
      case 'removeTest': this.removeTest(data.id); break;
      default:
        logging.warn('Unknown request');
        logging.warn(data);
    }
  }

  _onError(topic, err) {
    console.log(err);
    logging.error(`Error in topic ${topic}`);
    logging.error(err);
  }

  removeTest(id) {
    logging.verbose('Removing test ' + id);
    const i = this.queue.findIndex((item) => item.entryId === id);
    if (i !== -1) {
      const instance = this.queue[i];
      if (instance.running) {
        this.isRunning = false;
      }
      instance.abort = true;
      instance.removeAllListeners();
      this.queue.splice(i, 1);
      if (instance.workingDir) {
        instance.cleanup();
      }
    }
  }

  runTest(id) {
    logging.verbose('Running test ' + id);
    return this.testsModel.getTest(id)
    .then((info) => this.setupQueue(id, info))
    .catch((cause) => {
      logging.warn(cause);
    });
  }

  setupQueue(id, info) {
    const runner = new ApicTestRunner(id, info);
    this.queue.push(runner);
    logging.verbose('Test ' + id + ' added to the queue.');
    runner.on('end', () => this.afterRun(runner));
    runner.on('error', (err) => this.testError(runner, err));
    this.run();
  }

  routeMain(req, res) {
    res.send(`This worker has processed ${this.testCount} tests.`);
  }

  routeTestRun(req, res) {
    const id = req.params.id;
    this.runTest(id)
    .then(() => {
      res.send(`This worker has processed ${this.testCount} tests.`);
    })
    .catch((cause) => {
      console.error(cause);
      res.send(`${cause}`);
    });
  }

  afterRun(runner) {
    this.isRunning = false;
    this.testCount++;
    this._removeFromQueue(runner);
    this.run();
  }

  testError(runner, err) {
    this.isRunning = false;
    this.testCount++;
    this._removeFromQueue(runner);
    logging.error(err);
    this.run();
  }

  run() {
    if (this.isRunning) {
      return;
    }
    if (this.queue.length) {
      this.isRunning = true;
      this.queue[0].run();
    }
  }

  _removeFromQueue(instance) {
    const index = this.queue.indexOf(instance);
    if (index === -1) {
      logging.warn('Test runner instance not in the queue.');
      return;
    }
    this.queue.splice(index, 1);
  }
}

const worker = new ApiComponentsTestsWorker();
app.get('/', worker.routeMain.bind(worker));
app.get('/test/:id', worker.routeTestRun.bind(worker));
app.use(logging.errorLogger);

if (module === require.main) {
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`Worker listening on port ${port}`);
  });
  // worker.processMessages();
  worker.subscribe();
}

app.mocks = {
  // processAmfBranch: worker.processAmfBranch.bind(worker)
};

// Proxyquire requires this *exact* line, hence the "app.mocks" above
module.exports = app;
