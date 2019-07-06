const fs = require('fs-extra');
const conventionalChangelog = require('conventional-changelog');
const logging = require('../../lib/logging');
/**
 * A class that builds changelog file from git commits.
 */
class Changelog {
  /**
   * @constructor
   *
   * @param {String} workingDir Component directory location.
   */
  constructor(workingDir) {
    this.workingDir = workingDir;
    this.changelogFile = 'CHANGELOG.md';
    this.startDir = process.cwd();
  }
  /**
   * Builds changelog file.
   *
   * @return {Promise}
   */
  build() {
    logging.verbose('Building changelog...');
    process.chdir(this.workingDir);
    return fs.ensureFile(this.changelogFile)
    .then(() => this._runChangelog())
    .then(() => {
      process.chdir(this.startDir);
    })
    .catch((cause) => {
      process.chdir(this.startDir);
      throw cause;
    });
  }

  get() {
    logging.verbose('Reading changelog data...');
    process.chdir(this.workingDir);
    return fs.ensureFile(this.changelogFile)
    .then(() => this._changelogString())
    .then((result) => {
      process.chdir(this.startDir);
      return result;
    })
    .catch((cause) => {
      process.chdir(this.startDir);
      throw cause;
    });
  }
  /**
   * Get a stream from configured conventional releaser.
   * @return {[type]} [description]
   */
  _getChangelogStreem() {
    return conventionalChangelog({
      preset: 'angular',
      pkg: {
        path: 'package.json'
      },
      append: false,
      releaseCount: 1,
      reverse: false,
      warn: console.warn.bind(console),
      // debug: console.debug.bind(console)
    });
  }
  /**
   * Executes changelog command.
   *
   * @return {Promise}
   */
  _runChangelog() {
    return new Promise((resolve, reject) => {
      logging.verbose('Running changelog release...');
      const stream = this._getChangelogStreem();
      stream.on('error', (err) => reject(err));
      stream
      .pipe(fs.createWriteStream(this.changelogFile, {
        flags: 'a'
      }))
      .on('finish', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
    });
  }

  _changelogString() {
    return new Promise((resolve, reject) => {
      logging.verbose('Running changelog release...');
      const stream = this._getChangelogStreem();
      stream.on('error', (err) => reject(err));
      let result = '';
      stream.on('data', (chunk) => {
        result += chunk.toString();
      })
      .on('end', () => {
        resolve(result.trim());
      });
    });
  }
}
module.exports.Changelog = Changelog;
