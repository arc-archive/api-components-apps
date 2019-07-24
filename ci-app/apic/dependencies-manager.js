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
const npm = require('npm');
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
  async installDependencies(extra) {
    const bowerExists = await fs.pathExists(path.join(this.workingDir, 'bower.json'));
    if (bowerExists) {
      return await this._installBower(extra);
    }
    const nodeExists = await fs.pathExists(path.join(this.workingDir, 'package.json'));
    if (nodeExists) {
      return await this._installNode(extra);
    }
  }

  async _installBower(extra) {
    if (extra) {
      await this._addExtraBower(extra);
    }
    await this._processBowerDependencies();
  }

  async _installNode(extra) {
    if (extra) {
      await this._addExtraNode(extra);
    }
    await this._processNodeDependencies();
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
  _processBowerDependencies() {
    logging.verbose('Installing bower dependencies...');
    return new Promise((resolve, reject) => {
      const factory = bower.commands.install(
        [],
        {},
        {
          cwd: this.workingDir,
          quiet: true
        }
      );
      factory.on('end', () => resolve());
      factory.on('error', (e) => reject(e));
    }).then(() => {
      logging.verbose('Dependencies installed.');
    });
  }

  _processNodeDependencies() {
    logging.verbose('Installing npm dependencies...');
    return new Promise((resolve, reject) => {
      npm.load({
        'loaded': false,
        'progress': false,
        'no-audit': true
      }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        npm.commands.install(this.workingDir, [], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }).then(() => {
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
  async _addExtraBower(extra) {
    let { component, org, branch } = extra;
    if (!org) {
      org = 'advanced-rest-client';
    }
    const depenedency = `${org}/${component}#${branch}`;
    logging.verbose(`Adding extra dependency ${depenedency}...`);
    const file = path.join(this.workingDir, 'bower.json');
    const bower = await fs.readJson(file);
    if (!bower.dependencies) {
      bower.dependencies = {};
    }
    bower.dependencies[component] = depenedency;
    if (!bower.resolutions) {
      bower.resolutions = {};
    }
    bower.resolutions[component] = branch;
    await fs.outputJson(file, bower);
  }

  async _addExtraNode(extra) {
    let { component, org, branch } = extra;
    if (!org) {
      org = 'advanced-rest-client';
    }
    const url = `git://github.com/${org}/${component}.git#${branch}`;
    logging.verbose(`Adding extra dependency ${url}...`);
    const file = path.join(this.workingDir, 'package.json');
    const pkg = await fs.readJson(file);
    if (!pkg.dependencies) {
      pkg.dependencies = {};
    }
    pkg.dependencies[component] = url;
    await fs.outputJson(file, pkg);
  }
}
exports.DependendenciesManager = DependendenciesManager;
