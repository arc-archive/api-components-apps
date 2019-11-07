import GitHub from 'github-api';
import { Storage } from '@google-cloud/storage';
import logging from '../lib/logging';
import { GitSourceControl } from '../github/git-source-control.js';

const bucketName = 'apic-ci-amf-cache';

export class AmfBuilder {
  /**
   * @param {String} workingDir A working directory where to create AMF library
   * @param {Object} opts
   * - branch The branch name to checkout
   * - sha Commit SHA to checkout
   * Either sha or branch is allowed as an option.
   * If branch is passed it is translated to sha.
   */
  constructor(workingDir, opts) {
    this.workingDir = workingDir;
    this.branch = opts.branch;
    this.sha = opts.sha;
    this.storage = new Storage();
    this.bucket = this.storage.bucket(bucketName);
  }
  /**
   * Bucket file name for current configuration.
   * Be sure to call `requestSha()` before accessing this function.
   * @return {String}
   */
  get cacheFile() {
    const { sha } = this;
    if (!sha) {
      throw new Error('Commit sha not set');
    }
    return `${sha}-amf-cache.tar.gz`;
  }
  /**
   * Runs the builder. It tries to restore cached build of the AMF from
   * app's bucket or builds AMF from sources.
   *
   * The cache is restored for commit SHA value so it is safe to restore cache
   * from a branch as SHA is different when updated.
   *
   * @return {Promise}
   */
  async run() {
    try {
      if (!this.sha) {
        await this.requestSha();
      }
      await this.restoreCached();
      return;
    } catch (e) {
      logging.verbose(e.message);
    }
    logging.info('Building AMF from sources.');
    await this.cloneAmf();
  }
  /**
   * Clones AMF using HTTP scheme to a selected branch or SHA
   * @return {Promise}
   */
  async cloneAmf() {
    const github = new GitSourceControl(this.workingDir, 'aml-org', 'amf');
    await github.clone(false, this.branch || this.sha);
  }
  /**
   * It makes an API call to GitHub API to check for the sha value
   * for requested branch. The value is set on `this.sha`.
   *
   * @return {Promise}
   */
  async requestSha() {
    const { branch } = this;
    const github = new GitHub();
    const repo = github.getRepo('aml-org', 'amf');
    const info = await repo.getBranch(branch);
    if (!info) {
      throw new Error('Branch does not exists');
    }
    const { commit } = info;
    this.sha = commit.sha;
  }
  /**
   * Finds cached build of the AMF library.
   * @return {Promise<Boolean>} Resolved to a boolean value
   * where true means that the AMF library was restored.
   */
  async restoreCached() {
    await this.ensureBucket();
    const { cacheFile } = this;
    const file = this.bucket.file(cacheFile);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('AMF cache file does not exist.');
    }
    console.log('IMPLEMET ME!!!!!');
    throw new Error('TEST.');
  }
  /**
   * Creates a bucket with lifecycle rules when needed.
   * @return {Promise}
   */
  async ensureBucket() {
    const [exists] = await this.bucket.exists();
    if (exists) {
      return;
    }
    this.bucket = await this.bucket.create();
    // will keep files for 30 days
    await this.bucket.addLifecycleRule({
      action: 'delete',
      condition: {
        age: 30 // days
      }
    });
  }
}

// const { spawn } = require('child_process');
// const path = require('path');
// /* eslint-disable no-console */
// function prepareAmfBuild(workingDir, branch, sha) {
//   if (branch === 'master') {
//     branch = 'HEAD';
//   }
//   return new Promise((resolve, reject) => {
//     const amf = spawn(path.join(__dirname, 'amf-compiler.sh'), [workingDir, branch, sha]);
//     let lastError;
//
//     amf.stdout.on('data', (data) => {
//       console.info(`[AMF BUILD]: ${data}`);
//     });
//
//     amf.stderr.on('data', (data) => {
//       console.error(`[AMF BUILD] ERR: ${data}`);
//       const trimmed = data.trim ? data.trim() : data;
//       if (trimmed) {
//         lastError = trimmed;
//       }
//     });
//
//     amf.on('close', (code) => {
//       console.info(`[AMF BUILD] exit code is ${code}`);
//       if (code !== 0) {
//         if (lastError) {
//           lastError = new Error(lastError);
//         } else {
//           lastError = new Error('AMF build exit with code ' + code);
//         }
//         reject(lastError);
//       } else {
//         resolve();
//       }
//     });
//   });
// }
//
// module.exports = {
//   prepareAmfBuild
// };
