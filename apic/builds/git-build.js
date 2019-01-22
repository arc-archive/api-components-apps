const tmp = require('tmp');
const logging = require('../../lib/logging');
const fs = require('fs-extra');
const Git = require('nodegit');
const openpgp = require('openpgp');
const config = require('../../config');
/**
 * Base class for git builders.
 */
class GitBuild {
  /**
   * Creates a working directory where the files will be processed.
   *
   * @return {Promise} Resolved promise when the tmp dire was created
   * with path to the working
   * directory.
   */
  createWorkingDir() {
    return this.createTempDir()
    .then((path) => fs.realpath(path))
    .then((dir) => {
      logging.verbose('Created working directory ' + dir);
      this.workingDir = dir;
    });
  }
  /**
   * Cleans up the temporaty directory.
   * @return {Promise}
   */
  cleanup() {
    if (!this.workingDir) {
      return Promise.resolve();
    }
    logging.debug('Cleaning up temporaty dir...');
    return fs.pathExists(this.workingDir)
    .then((exists) => {
      if (exists) {
        logging.debug('Removing ' + this.workingDir);
        return fs.remove(this.workingDir);
      }
    });
  }
  /**
   * Creates a temp working dir for the console.
   * @return {Promise}
   */
  createTempDir() {
    logging.debug('Creating working directory...');
    return new Promise((resolve, reject) => {
      tmp.dir((err, _path) => {
        if (err) {
          reject(new Error('Unable to create a temp dir: ' + err.message));
        } else {
          resolve(_path);
        }
      });
    });
  }
  /**
   * Clones the repository to `workingDir`.
   * This sets `repo` property with the reference to `Repository` object.
   * @param {?String} branch Name of the branch to checkout. By default it is `info.branch`
   * @return {Promise}
   */
  _clone(branch) {
    logging.verbose('Cloning the repository...');
    const opts = {
      fetchOpts: this._getFetchOptions()
    };
    const checkoutBranch = branch || this.info.branch;
    return Git.Clone(this.info.sshUrl, this.workingDir, opts)
    .then((repo) => {
      this.repo = repo;
      return repo.getCurrentBranch();
    })
    .then((ref) => {
      logging.verbose('Repository cloned.');
      const current = ref.shorthand();
      if (current === checkoutBranch) {
        return;
      }
      return this._checkoutBranch(checkoutBranch);
    })
    .then(() => this.repo.getCurrentBranch())
    .then((ref) => {
      logging.verbose('On branch ' + ref.shorthand());
    });
  }

  _checkoutBranch(name) {
    logging.verbose(`Changing branch to ${name}...`);
    let creating;
    return this.repo.getBranch(name)
    .catch(() => {
      creating = true;
      return this._createBranch(name)
      .then((reference) => this.repo.checkoutBranch(reference, {}))
      .then(() => this.repo.getReferenceCommit('refs/remotes/origin/' + name))
      .then((commit) => Git.Reset.reset(this.repo, commit, 3, {}));
    })
    .then((ref) => {
      if (creating) {
        return;
      }
      return this.repo.checkoutBranch(ref, {});
    });
  }

  _createBranch(name) {
    logging.verbose(`Creating branch ${name}...`);
    return this.repo.getHeadCommit()
    .then((targetCommit) => {
      return this.repo.createBranch(name, targetCommit, false);
    });
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
  _onSignature(tosign) {
    return this._decryptGpg()
    .then((privateKeyResult) => {
      if (!privateKeyResult) {
        throw new Error('GPG key decoding error.');
      }
      // use binary to preserve line-endings to make signatures match
      const buf = new Uint8Array(tosign.length);
      for (let i = 0; i < tosign.length; i++) {
        buf[i] = tosign.charCodeAt(i);
      }

      const options = {
        message: openpgp.message.fromBinary(buf),
        privateKeys: [privateKeyResult],
        detached: true
      };
      return openpgp.sign(options);
    })
    .then((signed) => {
      return signed.signature;
    });
  }
  /**
   * Decrypts GPG key to be used to sign commits.
   * @return {Promise}
   */
  _decryptGpg() {
    let keyObj;
    const key = config.get('GPG_KEY');
    const pass = config.get('GPG_KEY_PASS');
    return fs.readFile(key)
    .then((buff) => openpgp.key.readArmored(buff))
    .then((result) => {
      keyObj = result.keys[0];
      return keyObj.decrypt(pass);
    })
    .then((result) => {
      if (result) {
        return keyObj;
      }
    });
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

  _push(branch) {
    logging.verbose('Pushing to the remote: ' + branch);
    return this.repo.getRemote('origin')
    .then((remote) => {
      const refs = [
        `refs/heads/${branch}:refs/heads/${branch}`
      ];
      return remote.push(refs, this._getFetchOptions());
    });
  }
}
module.exports.GitBuild = GitBuild;
