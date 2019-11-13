import fs from 'fs-extra';
import conventionalChangelog from 'conventional-changelog';
import Git from 'nodegit';
import path from 'path';
import semver from 'semver';
import logging from '../lib/logging';

const commitsMap = {
  build: 'Build',
  ci: 'Continuous integration',
  chore: 'Update',
  docs: 'Documentation',
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance Improvemenets',
  refactor: 'Refactor',
  revert: 'Reverting Changes',
  style: 'Styling',
  test: 'Testing',
  other: 'Other',
};
/**
 * A class that builds changelog file from git commits.
 */
export class Changelog {
  /**
   * @constructor
   *
   * @param {String} workingDir Component directory location.
   * @param {String} organization Component organization on GitHub
   * @param {String} repository Component repository name
   */
  constructor(workingDir, organization, repository) {
    this.workingDir = workingDir;
    this.changelogFile = 'CHANGELOG.md';
    this.organization = organization;
    this.component = repository;
  }

  get logPath() {
    const { workingDir, changelogFile } = this;
    return path.join(workingDir, changelogFile);
  }
  /**
   * Reads component's package JSON file.
   * @return {Promise<Object>} Promise resolved to file contents
   */
  async readPackage() {
    const pkgFile = path.join(this.workingDir, 'package.json');
    return await fs.readJSON(pkgFile);
  }
  /**
   * Opens an existing repository and sets `repo` property.
   * @return {Promise}
   */
  async open() {
    const dir = path.join(this.workingDir, '.git');
    return await Git.Repository.open(dir);
  }

  /**
   * Lists commits hostorty from `commit` to `until`.
   * @param {Object} commit A reference to a commit
   * @param {?String} until Optional. Commits equal or after this commit SHA
   * are excluded from the resulting list.
   * @return {Promise<Array>} A promise resolved to a list of commits.
   */
  listHistory(commit, until) {
    return new Promise((resolve, reject) => {
      const history = commit.history(Git.Revwalk.SORT.TIME);
      const commits = [];
      let finished = false;
      history.on('commit', (commit) => {
        if (finished) {
          return;
        }
        if (commit.sha() === until) {
          finished = true;
          return;
        }
        commits.push(commit);
      });
      history.on('end', () => {
        resolve(commits);
      });
      history.on('error', (e) => {
        reject(e);
      });
      history.start();
    });
  }

  async getTagCommit(repo, tagName) {
    const tag = await repo.getTagByName(tagName);
    const ref = await tag.peel();
    return await Git.Commit.lookup(repo, ref.id());
  }
  /**
   * Reads an SHA of a commit for last tag
   * @param {Object} repo Opened repository reference.
   * @return {Promise} A promise resolved to SHA or null if not found.
   */
  async getLastTagName(repo) {
    const tags = await Git.Tag.list(repo);
    if (!tags.length) {
      return null;
    }
    let tagName = tags.pop();
    // @FIXME: This to be removed in prod
    tagName = tags.pop();
    return tagName;
  }
  /**
   * Reads an SHA of a commit for the tag
   * @param {Object} repo Opened repository reference.
   * @param {?String} tagName A name of the tag to retreive SHA for
   * @return {Promise} A promise resolved to SHA or null if not found.
   */
  async getTagSha(repo, tagName) {
    if (!tagName) {
      return null;
    }
    const tagCommit = await this.getTagCommit(repo, tagName);
    if (!tagCommit) {
      return null;
    }
    return tagCommit.sha();
  }
  /**
   * Returns header message for a single commit
   * @param {String} version Current (new) version
   * @param {Object} masterCommit A reference to current commit
   * @param {Number} indent Header indent
   * @param {?String} last Optional last tag version
   * @return {String} header for a single commit.
   */
  getMessageHeader(version, masterCommit, indent, last) {
    const date = masterCommit.date();
    const shortDate = date.toISOString().split('T')[0];
    let header = `<a name="${version}"></a>\n`;
    const headerTag = new Array(indent).fill('#').join('');
    header += `${headerTag} `;
    if (last) {
      const { organization, component } = this;
      const url = `https://github.com/${organization}/${component}/compare/${last}...${version}`;
      header += `[${version}](${url})`;
    } else {
      header += `${version}`;
    }
    header += ` (${shortDate})\n\n`;
    return header;
  }

  /**
   * Transforms a list of commits into an info object with categorized list of messages.
   *
   * @param {Array<Object>} commits List of Commit
   * @return {Object} A map of categorized commit messages
   */
  processCommitMessages(commits) {
    const result = {
      build: [],
      ci: [],
      chore: [],
      docs: [],
      feat: [],
      fix: [],
      perf: [],
      refactor: [],
      revert: [],
      style: [],
      test: [],
      other: [],
    };
    const re = /^(build|ci|chore|docs|feat|fix|perf|refactor|revert|style|test): (.*)/;
    for (let i = 0, len = commits.length; i < len; i++) {
      const commit = commits[i];
      const message = commit.message();
      const matches = message.match(re);
      if (!matches) {
        continue;
      }
      const type = matches[1];
      const authorMessage = matches[2];
      const item = {
        sha: commit.sha(),
        message: authorMessage,
        author: commit.author().name(),
      };
      if (!result[type]) {
        item.message = message;
        result.other.push(item);
      } else {
        result[type].push(item);
      }
    }
    return result;
  }
  /**
   * Creates a changelog commits list message
   * @param {Object} info Info object returned by `processCommitMessages()`
   * @param {Number} indent Current title indent
   * @return {String} Commits log message
   */
  createCommitLog(info, indent) {
    const headerTag = new Array(indent + 1).fill('#').join('');
    const { organization, component } = this;
    let message = '';
    Object.keys(info).forEach((key) => {
      const messages = info[key];
      if (!messages.length) {
        return;
      }
      const title = commitsMap[key] || `Unknown (${key})`;
      message += `${headerTag} ${title}\n\n`;
      for (let i = 0, len = messages.length; i < len; i++) {
        const item = messages[i];
        const url = `https://github.com/${organization}/${component}/commit/${item.sha}`;
        const shortSha = item.sha.substr(0, 7);
        message += `* ${item.message} [${shortSha}](${url}) by ${item.author}\n`;
      }
      message += '\n\n';
    });
    return message;
  }
  /**
   * Builds a commit message from current commit to a last tag.
   * @param {Array<Object>} commits A list of commits the process
   * @param {String} version Current (new) version
   * @param {Object} masterCommit A reference to current commit.
   * @param {String} lastTagName Previous tag name
   * @return {String} Commit message for a tag
   */
  buildMessage(commits, version, masterCommit, lastTagName) {
    let headerIndent = 1;
    if (semver.patch(version) > 0) {
      headerIndent = 3;
    } else if (semver.minor(version) > 0) {
      headerIndent = 2;
    }

    let message = this.getMessageHeader(version, masterCommit, headerIndent, lastTagName);
    const data = this.processCommitMessages(commits);
    message += this.createCommitLog(data, headerIndent);

    return message;
  }

  /**
   * Generates a changelog entry for a tag from current commit to a previous commit.
   * @return {Promise}
   */
  async getLastTagChangelog() {
    const repo = await this.open();
    const lastTagName = await this.getLastTagName(repo);
    const lastTagSha = await this.getTagSha(repo, lastTagName);
    const commit = await repo.getMasterCommit();
    const commits = await this.listHistory(commit, lastTagSha);
    const pkg = await this.readPackage();
    const message = this.buildMessage(commits, pkg.version, commit, lastTagName);
    return message;
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
