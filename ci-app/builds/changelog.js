import fs from 'fs-extra';
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
  /**
   * @return {String} A path to the changelog file.
   */
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
    try {
      const tagCommit = await this.getTagCommit(repo, tagName);
      return tagCommit.sha();
    } catch (_) {
      return null;
    }
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
    const re = /^(build|ci|chore|docs|feat|fix|perf|refactor|revert|style|test|breaking|update|new|docs): (.*)/i;
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
   * Gets the main header level number
   * @param {String} version Current (new) version
   * @return {Number} Main header level
   */
  getHeaderLevel(version) {
    let headerIndent = 1;
    const path = semver.patch(version);
    const minor = semver.minor(version);
    const major = semver.major(version);
    if (major !== 0 && path > 0 || minor > 0) {
      headerIndent = 2;
    }
    return headerIndent;
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
    const headerIndent = this.getHeaderLevel(version);
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

  /**
   * Finds a commits for a tag. The tag is defined as a list of commits between two
   * tags represented by their commit SHA.
   * @param {Array<Object>} commits List of repo's commits
   * @param {?String} fromSha Starting (higher) tag's SHA
   * @param {?String} toSha Ending (lower) tag's SHA
   * @return {Array<Object>} A list of commits between the two tags.
   */
  findTagCommits(commits, fromSha, toSha) {
    const result = [];
    let started = fromSha ? false : true;
    for (let i = 0, len = commits.length; i < len; i++) {
      const commit = commits[i];
      const sha = commit.sha();
      if (!started && fromSha && sha === fromSha) {
        started = true;
        continue;
      }
      if (!started) {
        continue;
      }
      result.push(commit);
      if (toSha && toSha === sha) {
        break;
      }
    }
    return result;
  }

  /**
   * Creates a changelog file content for the whole history.
   * @return {Promise}
   */
  async createChangelogContent() {
    const repo = await this.open();
    const tags = await Git.Tag.list(repo);
    if (!tags.length) {
      return '';
    }
    const commit = await repo.getMasterCommit();
    const allCommits = await this.listHistory(commit);
    allCommits.reverse();
    let logs = '';
    for (let i = 0, len = tags.length; i < len; i++) {
      const tagName = tags[i];
      const tagSha = await this.getTagSha(repo, tagName);
      if (!tagSha) {
        continue;
      }
      const lastTagSha = await this.getTagSha(repo, tags[i - 1]);
      const commits = this.findTagCommits(allCommits, lastTagSha, tagSha);
      logs += this.buildMessage(commits, tagName, commit, tags[i - 1]);
    }
    return logs;
  }

  /**
   * Builds changelog file.
   *
   * @return {Promise}
   */
  async build() {
    logging.verbose('Building changelog...');
    const exists = await fs.pathExists(this.logPath);
    let log;
    if (!exists) {
      log = await this.createChangelogContent();
    } else {
      log = await this.getLastTagChangelog();
    }
    await fs.ensureFile(this.logPath);
    let contents = await fs.readFile(this.logPath, 'utf8');
    if (contents && contents.substr(contents.length - 2) !== '\n\n') {
      contents += '\n\n';
    }
    contents += log;
    await fs.writeFile(this.logPath, contents, 'utf8');
  }
  /**
   * Reads latest release log.
   *
   * @return {Promise}
   */
  async get() {
    logging.verbose('Reading changelog data...');
    return await this.getLastTagChangelog();
  }
}
