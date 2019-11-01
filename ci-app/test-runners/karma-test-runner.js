import { config, Server } from 'karma';
import path from 'path';
import { BaseTestRunner } from './base-test-runner';
import logging from '../lib/logging';

let runResult = {};

const ensureBrowser = (browser) => {
  const id = browser.id;
  if (!runResult[id]) {
    runResult[id] = {
      browser: browser.name,
      logs: [],
      startTime: browser.lastResult ? browser.lastResult.startTime : Date.now()
    };
  }
  return id;
};

const ArcCiReporter = function() {
  this.onSpecComplete = (browser, result) => {
    const id = ensureBrowser(browser);
    runResult[id].logs.push({
      suite: result.suite,
      description: result.description,
      success: result.success,
      skipped: result.skipped,
      errors: result.assertionErrors
    });
  };
};

export class KarmaTestRunner extends BaseTestRunner {
  getReport() {
    const keys = Object.keys(runResult);
    const report = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      error: false,
      results: []
    };
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      const browser = runResult[key];
      report.total += browser.total;
      report.success += browser.success;
      report.failed += browser.failed;
      report.skipped += browser.skipped;
      report.results.push(browser);
    }
    return report;
  }

  clearResults() {
    runResult = {};
  }

  async _run() {
    this.clearResults();
    const orig = process.cwd();
    process.chdir(this.componentDir);
    logging.verbose(`Changed dir to ${this.componentDir}`);
    logging.verbose(`Running karma tests for ${this.component}`);
    try {
      const opts = await this.createConfig();
      const port = 9876;
      opts.port = port;
      this.server = new Server(opts, (exitCode) => {
        process.chdir(orig);
        logging.verbose(`Karma has exited with ${exitCode}`);
        this._resolve(this.getReport());
        this.server = null;
      });
      this._addListeners(this.server);
      const result = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
      this.server.start();
      return result;
    } catch (e) {
      logging.verbose(`Error running karma tests: ${e.essage}`);
      throw e;
    }
  }

  async createConfig() {
    const cnf = config.parseConfig(path.resolve('./karma.conf.js'), {
      reporters: ['arcci']
    });
    if (!cnf.plugins) {
      cnf.plugins = [];
    }
    cnf.plugins.push({
      'reporter:arcci': ['type', ArcCiReporter]
    });
    return cnf;
  }

  _addListeners(srv) {
    srv.on('browser_complete', this._browserComplete.bind(this));
    srv.on('browser_error', this._browserError.bind(this));
    // srv.on('run_complete', this._runComplete.bind(this));
  }

  _browserComplete(browser, result) {
    const id = ensureBrowser(browser);
    const lastResult = browser.lastResult || {};
    const b = runResult[id];
    b.total = lastResult.total || 0;
    b.success = lastResult.success || 0;
    b.failed = lastResult.failed || 0;
    b.skipped = lastResult.skipped || 0;
    b.error = lastResult.error;
    b.endTime = lastResult.endTime || Date.now();
  }

  _browserError(browser, error) {
    const id = ensureBrowser(browser);
    const b = runResult[id];
    b.error = true;
    b.message = String(error);
    const lastResult = browser.lastResult || {};
    b.total = lastResult.total || 0;
    b.success = lastResult.success || 0;
    b.failed = lastResult.failed || 0;
    b.skipped = lastResult.skipped || 0;
    b.endTime = lastResult.endTime || Date.now();
  }

  // _runComplete(browsers, results) {
  //   console.log(runResult);
  // }
}
