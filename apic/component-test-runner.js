const path = require('path');
const {Writable} = require('stream');
const {test: wctTest} = require('web-component-tester');
const logging = require('../lib/logging');

class WctOutput extends Writable {
  _write(chunk, enc, next) {
    logging.debug(chunk.toString());
    next();
  }
}

class ComponentTestRunner {
  constructor(component, buildPath) {
    this.component = component;
    this.workingDir = buildPath;
    this.componentDir = path.join(buildPath, component);

    this.results = {};
    this.passing = undefined;
    this.retry = 0;
  }

  getWctOptions() {
    const output = new WctOutput();
    const result = {
      root: this.componentDir,
      output,
      plugins: ['local'],
      skipPlugins: ['istanbub', 'sauce'],
      color: false,
      simpleOutput: true,
      verbose: false,
      reporters: ['json'],
      registerHooks: (context) => {
        context.on('browser-init', this._browserInitHook.bind(this));
        context.on('browser-start', this._browserStartHook.bind(this));
        context.on('test-end', this._testEndHook.bind(this));
        context.on('browser-end', this._browserEndHook.bind(this));
      }
    };

    return result;
  }

  _computeBrowserId(browser) {
    return browser.browserName + '|' + browser.version;
  }

  _browserInitHook(browser) {
    const id = this._computeBrowserId(browser);
    logging.verbose('WCT initializing browser ' + browser.browserName);
    this.results[id] = {
      status: 'init',
      browser: browser.browserName,
      version: browser.version,
      logs: [],
      startTime: Date.now()
    };
  }

  _browserStartHook(browser) {
    const id = this._computeBrowserId(browser);
    this.results[id].status = 'running';
    logging.verbose('WCT starting browser ' + this.results[id].browserName);
  }

  _testEndHook(browser, test) {
    const id = this._computeBrowserId(browser);
    this.results[id].logs.push({
      path: test.test,
      state: test.state
    });
    logging.verbose('WCT test executed with result ' + test.sate);
  }

  _browserEndHook(browser, error) {
    const id = this._computeBrowserId(browser);
    this.results[id].status = error ? 'failed' : 'passed';
    this.results[id].endTime = Date.now();
    if (error) {
      this.results[id].message = this._browserErrorMessage(error);
      this.results[id].error = true;
    }
    logging.verbose('WCT browser ' + this.results[id].browserName + ' ended with status ' + this.results[id].status);
  }

  _browserErrorMessage(error) {
    if (typeof error !== 'string') {
      error = error.message;
    }
    if (!error) {
      return '';
    }
    error = error.split('\n')[0].trim();
    if (error[0] === '[') {
      error = error.substr(error.indexOf(']') + 2);
    }
    return error;
  }

  run() {
    logging.verbose('Running selenium tests for ' + this.component);
    const opts = this.getWctOptions();
    return wctTest(opts)
    .catch(() => {})
    .then(() => {
      logging.verbose('Selenium tests finished ' + this.component);
      this._processResults();
      const report = this.generateReport();
      this.report = report;
      return report;
    });
  }

  _createResult() {
    const keys = Object.keys(this.results);
    const data = [];
    for (let i = 0, len = keys.length; i < len; i++) {
      const browser = this.results[keys[i]];
      browser.passed = 0;
      browser.failed = 0;
      const logs = browser.logs;
      if (logs || logs.length) {
        for (let j = 0, jLen = logs.length; j < jLen; j++) {
          if (logs[j].state === 'passing') {
            browser.passed++;
          } else {
            browser.failed++;
          }
        }
      }
      data[data.length] = browser;
    }
    return data;
  }

  _processResults() {
    const results = this.results;
    const keys = Object.keys(results);
    const hasResults = keys.some((key) => results[key].logs.length);
    const hasFailure = keys.some((key) => results[key].status !== 'passed');
    if (!hasResults) {
      if (this.retry === 0) {
        this.retry++;
        this.results = {};
        logging.verbose(`Retrying ${this.component} due missing results.`);
        return this.run();
      }
    }
    this.passing = !hasFailure;
    this.results = this._createResult();
  }

  generateReport() {
    let passed = 0;
    let failed = 0;
    for (let i = 0, len = this.results.length; i < len; i++) {
      const browser = this.results[i];
      passed += browser.passed;
      failed += browser.failed;
      if (browser.error) {
        failed++;
      }
    }
    return {
      passing: this.passing,
      retry: this.retry,
      results: this.results,
      passed,
      failed,
      endTime: Date.now()
    };
  }
}

module.exports.ComponentTestRunner = ComponentTestRunner;
