import fs from 'fs-extra';
import conventionalChangelog from 'conventional-changelog';
import Git from 'nodegit';
import path from 'path';
import semver from 'semver';
import logging from '../lib/logging';

const versionRe = /##? (\d+.\d+.\d+) \(\d{4}-\d{2}-\d{2}\)/;
/**
 * A class that builds changelog file from git commits.
 */
export class Changelog {
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

  get logPath() {
    const { workingDir, changelogFile } = this;
    return path.join(workingDir, changelogFile);
  }
  /**
   * Opens an existing repository and sets `repo` property.
   * @return {Promise}
   */
  async open() {
    const dir = path.join(this.workingDir);
    return await Git.Repository.open(dir);
  }

  async getLastCommit() {
    const file = this.logPath;
    await fs.ensureFile(file);
    const result = await fs.readFile(file, 'utf8');
    const lines = result.split('/');
    let version;
    lines.forEach((line) => {
      const matches = line.match(versionRe);
      if (!matches) {
        return;
      }
      const tmp = matches[1];
      if (!version) {
        version = tmp;
      } else if (semver.gt(tmp, version)) {
        version = tmp;
      }
    });
    return version;
  }

  // getCommitHistory(masterCommit) {
  //   return new Promise((resolve) => {
  //     const history = masterCommit.history(Git.Revwalk.SORT.TIME);
  //     console.log(history);
  //     history.on('commit', function(commit) {
  //       console.log("commit " + commit.sha());
  //       console.log("Author:", commit.author().name() +
  //         " <" + commit.author().email() + ">");
  //       console.log("Date:", commit.date());
  //       console.log("\n    " + commit.message());
  //     });
  //
  //     // Don't forget to call `start()`!
  //     history.start();
  //   });
  // }

  async getMaserCommit(repo) {
    return await repo.getMasterCommit();
  }

  // async updateChangelog() {
  //   const repo = await this.open();
  //   const [latestTag] = await Git.Tag.list(repo);
  //   const tag = await repo.getTagByName(latestTag);
  //   console.log(tag);
  //   // const latest = await this.getLastCommit();
  //   // const masterCommit = await this.getMaserCommit(repo);
  //   // await this.getCommitHistory(masterCommit);
  // }

  /**
   * Builds changelog file.
   *
   * @return {Promise}
   */
  build() {
    logging.verbose('Building changelog...');
    process.chdir(this.workingDir);
    return fs
        .ensureFile(this.changelogFile)
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
    return fs
        .ensureFile(this.changelogFile)
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
  _getChangelogStream() {
    return conventionalChangelog({
      preset: 'angular',
      pkg: {
        path: 'package.json'
      },
      append: true,
      releaseCount: 0,
      // reverse: true,
      // warn: console.warn.bind(console)
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
      const stream = this._getChangelogStream();
      stream.on('error', (err) => reject(err));
      stream
          .pipe(
              fs.createWriteStream(this.changelogFile, {
                flags: 'a'
              })
          )
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
      const stream = this._getChangelogStream();
      stream.on('error', (err) => reject(err));
      let result = '';
      stream
          .on('data', (chunk) => {
            result += chunk.toString();
          })
          .on('end', () => {
            resolve(result.trim());
          });
    });
  }
}
