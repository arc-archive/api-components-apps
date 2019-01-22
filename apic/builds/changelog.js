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
  /**
   * Executes changelog command.
   *
   * @return {Promise}
   */
  _runChangelog() {
    return new Promise((resolve, reject) => {
      logging.verbose('Running changelog release...');
      const stream = conventionalChangelog({
        preset: 'eslint',
        pkg: {
          path: 'package.json'
        },
        append: true,
        releaseCount: 1,
        warn: console.warn.bind(console),
        // debug: console.debug.bind(console)
      });
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
}
module.exports.Changelog = Changelog;
