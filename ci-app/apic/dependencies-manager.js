'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */
const fs = require('fs-extra');
const path = require('path');
const bower = require('bower');
const logging = require('../lib/logging');
/**
 * A class responsible for installing component dependencies.
 */
class DependendenciesManager {
  /**
   * Constructs the processor.
   *
   * @param {String} workingDir Path to a working directory instance.
   */
  constructor(workingDir) {
    /**
     * A directory where all operations will be performed
     *
     * @type {String}
     */
    this.workingDir = workingDir;
  }
  /**
   * Installs bower dependencies if the `bower.json` file exists in `workingDir`
   *
   * @param {?Object} extra An extra component to install after bower dependencies are installed.
   * @return {Promise} Resolved promise when operation is completed.
   */
  installDependencies(extra) {
    return fs.pathExists(path.join(this.workingDir, 'bower.json'))
    .then((exists) => {
      if (!exists) {
        // no bower file, exit.
        logging.info('No bower file. Skipping dependencies.');
        return;
      }
      let p;
      if (extra) {
        p = this._addExtraBower(extra);
      } else {
        p = Promise.resolve();
      }
      return p.then(() => this._processDependencies());
    });
  }
  /**
   * Processes dependencies installation.
   * It checks if bower is already installed in local machine and if it is
   * it will use installed version. If not it installs bower locally.
   *
   * Next, it insttalls bower dependencies.
   * For certain types of builds more dependencies are required. If needed
   * it will install additional dependencies that are not set in API console
   * bower file.
   *
   * @return {Promise} A promise resolve itself when all dependencies are
   * installed.
   */
  _processDependencies() {
    logging.verbose('Installing bower dependencies...');
    return new Promise((resolve, reject) => {
      const factory = bower.commands.install([], {}, {
        cwd: this.workingDir,
        quiet: true
      });
      factory.on('end', () => resolve());
      factory.on('error', (e) => reject(e));
    })
    .then(() => {
      logging.verbose('Dependencies installed.');
    });
  }
  /**
   * Adds a depdendency to bower file when running `bottom-up` tests to inject
   * a component into the test run.
   * @param {Object} extra Extra component definition:
   * - `component` Stirng - component name
   * - `branch` String - branch to checkout.
   * @return {Promise}
   */
  _addExtraBower(extra) {
    const name = extra.component;
    const depenedency = `advanced-rest-client/${extra.component}#${extra.branch}`;
    logging.verbose(`Adding extra dependency ${depenedency}...`);
    const file = path.join(this.workingDir, 'bower.json');
    return fs.readJson(file)
    .then((bower) => {
      if (!bower.dependencies) {
        bower.dependencies = {};
      }
      bower.dependencies[name] = depenedency;
      if (!bower.resolutions) {
        bower.resolutions = {};
      }
      bower.resolutions[name] = extra.branch;
      return fs.outputJson(file, bower);
    });
  }
}
exports.DependendenciesManager = DependendenciesManager;
