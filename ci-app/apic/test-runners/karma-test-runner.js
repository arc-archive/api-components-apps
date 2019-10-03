const { config, Server } = require('karma');
const path = require('path');
const fs = require('fs-extra');
const { BaseTestRunner } = require('./base-test-runner');
const logging = require('../../lib/logging');

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

class KarmaTestRunner extends BaseTestRunner {
  async addTests() {
    let content = await fs.readFile('./test/file-drop.test.js', 'utf8');
    content += `
    describe('tests test', () => {
      async function basicFixture() {
        return (await fixture(\`<file-drop></file-drop>\`));
      }

      let element;
      beforeEach(async () => {
        element = await basicFixture();
      });

      it.skip('Skips the test', () => {});
      it('Fails the test', () => {
        assert.isTrue(element.dragging);
      });
    });`;
    await fs.writeFile('./test/file-drop.test.js', content, 'utf8');
  }

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

  async _run() {
    runResult = {};
    const orig = process.cwd();
    process.chdir(this.componentDir);
    logging.verbose(`Changed dir to ${this.componentDir}`);
    // await this.addTests();
    logging.verbose(`Running karma tests for ${this.component}`);
    const opts = await this.createConfig();
    this.server = new Server(opts, (exitCode) => {
      process.chdir(orig);
      logging.verbose(`Karma has exited with ${exitCode}`);
      this._resolve(this.getReport());
    });
    this._addListeners(this.server);
    const result = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.server.start();
    return result;
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
module.exports.KarmaTestRunner = KarmaTestRunner;
