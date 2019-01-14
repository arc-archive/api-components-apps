// Copyright 2018, Google, Inc.
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

// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent');
}

const express = require('express');
const config = require('./config');
const logging = require('./lib/logging');
const background = require('./lib/background');
const {prepareAmfBuild} = require('./apic/amf-builder.js');
const {CatalogModel} = require('./apic/models/catalog-model');
const {TestsModel} = require('./apic/models/test-model');
const {ApicTestRunner} = require('./apic/test-runner');

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
    this.catalogModel = new CatalogModel();
    this.testsModel = new TestsModel();
    this.queue = [];
  }
  /**
   * Subscribe to Cloud Pub/Sub and receive messages to process tests requests.
   * The subscription will continue to listen for messages until the process
   * is killed
   */
  subscribe() {
    background.subscribe((err, data) => {
      if (err) {
        throw err;
      }
      switch (data.action) {
        case 'runTest': this.runTest(data.id); break;
        default:
          logging.warn('Unknown request', data);
      }
    });
  }

  runTest(id) {
    console.log('RUNNING TEST BY ID', id);
    // master1547278945743
    return this.testsModel.getTest(id)
    .then((info) => this.setupQueue(id, info));
  }

  setupQueue(id, info) {
    const runner = new ApicTestRunner(id, info);
    this.queue.push(runner);
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
    console.log(`App listening on port ${port}`);
  });
  worker.subscribe();
}

app.mocks = {
  processAmfBranch: worker.processAmfBranch
};

// Proxyquire requires this *exact* line, hence the "app.mocks" above
module.exports = app;
