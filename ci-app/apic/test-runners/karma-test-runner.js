const { config, Server } = require('karma');
const path = require('path');
const { BaseTestRunner } = require('./base-test-runner');
const logging = require('../../lib/logging');

const ArcCiReporter = function() {
  // this.adapters = [
  //   function(msg) {
  //     console.log('aaaaaaaaaaaaaaaaa', msg);
  //   }
  // ];
  // this.writeCommonMsg = function(msg) {
  //   console.log('aaaaaaaaaaaaaaaaa', msg);
  // };
  // this.write = function(msg) {
  //   console.log('aaaaaaaaaaaaaaaaa', msg);
  // };
  // this.onRunStart = function(browsers) {
  //   console.log('onRunStart', browsers);
  // };
  // this.onBrowserLog = (browser, log, type) => {
  //   if (log) {
  //     console.log('onBrowserLog', browser.name, log, type);
  //   }
  // };
  // this.renderBrowser = (browser) => {
  //   console.log('renderBrowser', browser);
  // };
  // this.specSuccess = function(browser, result) {
  //   console.log('specSuccess', browser, result);
  // };
  // this.onRunComplete = (browsers, results) => {
  //   console.log('onRunComplete', results);
  // };
  // this.specFailure = (browser, result) => {
  //   console.log('specFailure', result);
  // };
  // this.specSkipped = (browser, result) => {
  //   console.log('specSkipped', result);
  // };
  this.onSpecComplete = (browser, result) => {
    console.log('onSpecComplete', result);
    /*
{ id: '',
  description: 'Star click changes value',
  suite: [ '<star-rating>', '_clickHandler()' ],
  success: true,
  skipped: false,
  time: 1,
  log: [],
  assertionErrors: [],
  startTime: 1563954589460,
  endTime: 1563954589475
}
     */
  };
};

class KarmaTestRunner extends BaseTestRunner {
  async _run() {
    const orig = process.cwd();
    process.chdir(this.componentDir);

    logging.verbose(`Running karma tests for ${this.component}`);
    const opts = this.createConfig();
    this.server = new Server(opts, (exitCode) => {
      process.chdir(orig);
      logging.verbose(`Karma has exited with ${exitCode}`);
      this._resolve();
    });
    this._addListeners(this.server);
    const result = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.server.start();
    return result;
  }

  createConfig() {
    const cnf = config.parseConfig(path.join(this.componentDir, 'karma.conf.js'), {
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
    srv.on('run_complete', this._runComplete.bind(this));
  }

  _browserComplete(browser, result) {
    console.log('_browserComplete');
    // console.log(browser, result);
    console.log(result);
  }

  _browserError(browser, error) {
    console.log('_browserError');
    console.log(browser, error);
  }

  _runComplete(browsers, results) {
    console.log('_runComplete');
    console.log(browsers, results);
  }
}
module.exports.KarmaTestRunner = KarmaTestRunner;
