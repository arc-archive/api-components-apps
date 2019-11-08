import semver from 'semver';
import fs from 'fs-extra';
import path from 'path';
import logging from '../lib/logging';

export class VersionBump {
  /**
   * @param {String} pkgDir A directory where package sources are located
   */
  constructor(pkgDir) {
    if (!pkgDir) {
      throw new Error('pkgDir is a required argument when publishing a package');
    }
    /**
     * Package directory
     * @type {String}
     */
    this.pkgDir = pkgDir;
  }

  get packageFile() {
    const { pkgDir } = this;
    return path.join(pkgDir, 'package.json');
  }

  get lockFile() {
    const { pkgDir } = this;
    return path.join(pkgDir, 'package-lock.json');
  }

  /**
   * Bumps version of the package.
   * @param {String} type
   * - major
   * - minor
   * - patch
   * @return {Promise<Array>} Promise resolved to an array where items are boolean
   * values whether (in order) package.json and package-lock.json files were updated.
   */
  async bump(type) {
    logging.info(`Bumping ${type} version`);
    const pkg = await this.getPackage();
    const current = pkg.version;
    if (!current) {
      return [false, false];
    }
    const preInfo = semver.prerelease(current);
    if (preInfo) {
      type = 'prerelease';
    }
    const updated = semver.inc(current, type);
    pkg.version = updated;
    await fs.writeJson(this.packageFile, pkg);
    const lockUpdated = await this.updateLockFile(updated);
    return [true, lockUpdated];
  }
  /**
   * Reads contents of the package.json file.
   * @return {Promise<Object>}
   */
  async getPackage() {
    const { packageFile } = this;
    return await fs.readJson(packageFile);
  }
  /**
   * Updates version in `package-lock.json` file.
   * @param {String} version New version
   * @return {Promise<Boolean>} Promise resolved to a boolean value whether the
   * file was updated.
   */
  async updateLockFile(version) {
    const { lockFile } = this;
    const exists = await fs.pathExists(lockFile);
    if (!exists) {
      return false;
    }
    try {
      const pkg = await fs.readJson(lockFile);
      pkg.version = version;
      await fs.writeJson(lockFile, pkg);
      return true;
    } catch (e) {
      logging.error(`Unable to bump package-lock.json file ${e.message}`);
      return false;
    }
  }
}
