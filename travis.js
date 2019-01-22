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
const {ApicBuildRunner} = require('./apic/builds/build-runner');

/**
 * Routing for GitHub web hooks.
 */
class TravisBuild {
  constructor() {
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
    background.on('travis-message', this._onMessage);
    background.on('travis-error', this._onError);
    return background.subscribeTravisBuild();
  }

  _onMessage(topic, subscription, data) {
    switch (data.action) {
      case 'process-build': this.processBuild(data.id); break;
      default:
        logging.warn('Unknown request');
        logging.warn(data);
    }
  }

  _onError(topic, subscription, err) {
    logging.error(`Error in travis topic ${topic} with subscription ${subscription}`);
    console.log(err);
    logging.error(err);
  }

  processBuild(buildId) {
    this.setupQueue(buildId);
  }

  setupQueue(id) {
    const runner = new ApicBuildRunner(id);
    this.queue.push(runner);
    logging.verbose('Build ' + id + ' added to the queue.');
    runner.on('end', () => this.afterRun(runner));
    runner.on('error', (err) => this.buildError(runner, err));
    this.run();
  }

  afterRun(runner) {
    this.isRunning = false;
    this._removeFromQueue(runner);
    this.run();
  }

  buildError(runner, err) {
    this.isRunning = false;
    this._removeFromQueue(runner);
    console.log(err);
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

  routeRun(req, res) {
    const {id} = req.params;
    this.setupQueue(id);
    res.sendStatus(204);
  }

  _removeFromQueue(instance) {
    const index = this.queue.indexOf(instance);
    if (index === -1) {
      logging.warn('Test runner instance not in the queue.');
      return;
    }
    instance.abort = true;
    this.queue.splice(index, 1);
  }
}

// When running on Google App Engine Managed VMs, the worker needs
// to respond to HTTP requests and can optionally supply a health check.
const app = express();

app.use(logging.requestLogger);

app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});


const worker = new TravisBuild();
// app.get('/', worker.routeMain.bind(worker));
app.get('/:id', worker.routeRun.bind(worker));
app.use(logging.errorLogger);

if (module === require.main) {
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`Travis app listening on port ${port}`);
  });
  worker.subscribe();
}

// app.mocks = {
//   processAmfBranch: worker.processAmfBranch.bind(worker)
// };

// Proxyquire requires this *exact* line, hence the "app.mocks" above
module.exports = app;
