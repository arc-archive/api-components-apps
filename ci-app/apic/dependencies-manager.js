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
   * @return {Promise} Resolved promise when operation is completed.
   */
  installDependencies() {
    return fs.pathExists(path.join(this.workingDir, 'bower.json'))
    .then((exists) => {
      if (!exists) {
        // no bower file, exit.
        logging.info('No bower file. Skipping dependencies.');
        return;
      }
      return this._processDependencies();
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
}
exports.DependendenciesManager = DependendenciesManager;
