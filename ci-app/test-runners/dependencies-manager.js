/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */
import fs from 'fs-extra';
import path from 'path';
import npm from 'npm';
import logging from '../lib/logging';
/**
 * A class responsible for installing component dependencies.
 */
export class DependendenciesManager {
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
   * Installs component dependencies
   *
   * @param {?Object} extra An extra component to install after dependencies are installed.
   * @return {Promise} Resolved promise when operation is completed.
   */
  async installDependencies(extra) {
    const nodeExists = await fs.pathExists(path.join(this.workingDir, 'package.json'));
    if (nodeExists) {
      return await this._installNode(extra);
    }
  }

  async _installNode(extra) {
    if (extra) {
      await this._addExtraNode(extra);
    }
    await this._processNodeDependencies();
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

  async _addExtraNode(extra) {
    let { component, org, branch, pkgName } = extra;
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
    pkg.dependencies[pkgName] = url;
    await fs.outputJson(file, pkg);
  }
}
