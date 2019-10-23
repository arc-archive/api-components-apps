import fs from 'fs-extra';
import Git from 'nodegit';
import openpgp from 'openpgp';
import { BaseBuild } from './base-build.js';
import logging from '../lib/logging';
import config from '../config';
/**
 * Base class for git builders.
 */
export class GitBuild extends BaseBuild {
  /**
   * Clones the repository.
   * This sets `repo` property with the reference to `Repository` object.
   *
   * @param {?Object} cloneOpts An object to override values from `this.info`
   * property. Additional property is `componentDir` which overrides `this.workingDir`.
   * @return {Promise}
   */
  async _clone(cloneOpts) {
    const opts = {
      fetchOpts: this._getFetchOptions()
    };
    const info = Object.assign({}, this.info || {}, cloneOpts || {});
    const componentDir = info.componentDir || this.workingDir;
    logging.verbose(`Cloning ${info.sshUrl}...`);
    const repo = await Git.Clone(info.sshUrl, componentDir, opts);
    this.repo = repo;
    let ref = await repo.getCurrentBranch();
    logging.verbose('Repository cloned.');
    const current = ref.shorthand();
    if (current !== info.branch) {
      await this._checkoutBranch(info.branch);
    }
    ref = await this.repo.getCurrentBranch();
    logging.verbose('On branch ' + ref.shorthand());
  }

  async _checkoutBranch(name) {
    logging.verbose(`Changing branch to ${name}...`);
    let ref;
    try {
      ref = await this.repo.getBranch(name);
    } catch (_) {
      const reference = await this._createBranch(name);
      await this.repo.checkoutBranch(reference, {});
      const commit = await this.repo.getReferenceCommit('refs/remotes/origin/' + name);
      await Git.Reset.reset(this.repo, commit, 3, {});
    }
    if (ref) {
      await this.repo.checkoutBranch(ref, {});
    }
  }
  /**
   * Creates a branch for given name.
   * @param {String} name Name of the branch to create
   * @return {Promise} Resolved promise returns a {Git.Reference} object.
   */
  async _createBranch(name) {
    logging.verbose(`Creating branch ${name}...`);
    const targetCommit = await this.repo.getHeadCommit();
    return await this.repo.createBranch(name, targetCommit, false);
  }

  /**
   * Creates a FetchOptions object as defined in nodegit.
   * This uses configured SSH key to be used to connect to GitHub.
   * @return {Object}
   */
  _getFetchOptions() {
    return {
      callbacks: {
        credentials: function(url, userName) {
          return Git.Cred.sshKeyNew(
            userName,
            config.get('GITHUB_SSH_KEY_PUB'),
            config.get('GITHUB_SSH_KEY'),
            config.get('GITHUB_SSH_KEY_PASS')
          );
        }
      }
    };
  }

  /**
   * Callback for GPG signature when signing the commit.
   * @param {String} tosign A string to sign.
   * @return {Promise}
   */
  async _onSignature(tosign) {
    const privateKeyResult = await this._decryptGpg();
    if (!privateKeyResult) {
      throw new Error('GPG key decoding error.');
    }
    const buf = new Uint8Array(tosign.length);
    for (let i = 0; i < tosign.length; i++) {
      buf[i] = tosign.charCodeAt(i);
    }
    const options = {
      message: openpgp.message.fromBinary(buf),
      privateKeys: [privateKeyResult],
      detached: true
    };
    const signed = await openpgp.sign(options);
    return signed.signature;
  }
  /**
   * Decrypts GPG key to be used to sign commits.
   * @return {Promise}
   */
  async _decryptGpg() {
    const key = config.get('GPG_KEY');
    const pass = config.get('GPG_KEY_PASS');
    const buff = await fs.readFile(key);
    const armored = await openpgp.key.readArmored(buff);
    const keyObj = armored.keys[0];
    const decrypted = keyObj.decrypt(pass);
    if (decrypted) {
      return keyObj;
    }
  }
  /**
   * Creates a signature object from application configuration.
   * @return {Git.Signature}
   */
  _createSignature() {
    const name = config.get('CI_NAME');
    const email = config.get('CI_EMAIL');
    return Git.Signature.now(name, email);
  }
  /**
   * Creates a commit.
   * @TODO: when nodegit is ready to use GPG keys this should use configured
   * GPG key to sing the commit. Currently GPG support is merged with master but
   * not yet released.
   * @param {String} branch Current branch
   * @param {String} message Commit message
   * @param {String} oid Commit ID.
   * @param {Array} parents Commit parents.
   * @return {Promise}
   */
  _createCommit(branch, message, oid, parents) {
    const author = this._createSignature();
    const committer = this._createSignature();
    return this.repo.createCommit(branch, author, committer, message, oid, parents);
    // https://github.com/nodegit/nodegit/issues/1018
    // return this.repo.createCommitWithSignature(author, committer, message, oid,
    //   parents, 'gpgsig', this._onSignature.bind(this));
  }

  async _push(branch) {
    logging.verbose('Pushing to the remote: ' + branch);
    const remote = await this.repo.getRemote('origin');
    const refs = [`refs/heads/${branch}:refs/heads/${branch}`];
    return await remote.push(refs, this._getFetchOptions());
  }
}
