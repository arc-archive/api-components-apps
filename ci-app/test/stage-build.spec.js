const { StageBuild } = require('../builds/stage-build.js');
import { GitSourceControl } from '../github/git-source-control.js';
const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { createRepository } = require('./urils');

describe('StageBuild', () => {
  function initInfo() {
    return {
      branch: 'stage',
      bumpVersion: true,
      commit: 'eb93db478bc5d4dc5056a765985dc6efd12509da',
      component: 'advanced-rest-client/api-url-editor',
      created: 1573186553777,
      org: 'advanced-rest-client',
      sshUrl: 'git@github.com:advanced-rest-client/api-url-editor.git',
      startTime: 1573186554511,
      status: 'scheduled',
      type: 'stage-build',
    };
  }

  describe('constructor()', () => {
    it('Sets component name', () => {
      const instance = new StageBuild(initInfo());
      assert.equal(instance.name, 'api-url-editor');
    });

    it('Sets component organization', () => {
      const instance = new StageBuild(initInfo());
      assert.equal(instance.organization, 'advanced-rest-client');
    });

    it('Sets bumpVersion when present', () => {
      const instance = new StageBuild(initInfo());
      assert.isTrue(instance.bumpVersion);
    });

    it('Sets bumpVersion when not present', () => {
      const info = initInfo();
      delete info.bumpVersion;
      const instance = new StageBuild(info);
      assert.isFalse(instance.bumpVersion);
    });
  });

  describe('#elementWorkingDir', () => {
    it('returns working rirectory', () => {
      const instance = new StageBuild(initInfo());
      instance.workingDir = 'test';
      assert.equal(instance.elementWorkingDir, path.join('test', 'api-url-editor'));
    });
  });

  describe('initBuild()', () => {
    let instance;
    beforeEach(() => {
      instance = new StageBuild(initInfo());
    });

    afterEach(async () => {
      await instance.cleanup();
    });

    it('sets working directory', async () => {
      await instance.initBuild();
      const exists = await fs.pathExists(instance.workingDir);
      assert.isTrue(exists);
    });

    it('sets git reference', async () => {
      await instance.initBuild();
      assert.ok(instance.git, 'git is created');
      assert.equal(instance.git.workingDir, instance.workingDir, 'working dir is set');
      assert.equal(instance.git.org, instance.organization, 'organization is set');
      assert.equal(instance.git.name, instance.name, 'name is set');
    });
  });

  describe('cloneComponent()', () => {
    let instance;
    before(async () => {
      instance = new StageBuild(initInfo());
      await instance.initBuild();
      await instance.cloneComponent();
    });

    after(async () => {
      await instance.cleanup();
    });

    it('clones the repository', async () => {
      const exists = await fs.pathExists(instance.elementWorkingDir);
      assert.isTrue(exists);
    });

    it('checkouts stage branch', async () => {
      const repo = instance.git.repo;
      const ref = await repo.getCurrentBranch();
      const current = ref.shorthand();
      assert.equal(current, 'stage');
    });
  });

  describe('bumpPackageVersion()', () => {
    let instance;
    let pkgFile;
    let lockFile;
    beforeEach(async () => {
      instance = new StageBuild(initInfo());
      await instance.initBuild();
    });

    async function createPackage(instance, version) {
      version = version || '1.0.0';
      pkgFile = path.join(instance.elementWorkingDir, 'package.json');
      await fs.ensureDir(instance.elementWorkingDir);
      await fs.writeJson(pkgFile, { version });
    }

    async function createLock(instance, version) {
      version = version || '1.0.0';
      lockFile = path.join(instance.elementWorkingDir, 'package-lock.json');
      await fs.ensureDir(instance.elementWorkingDir);
      await fs.writeJson(lockFile, { version });
    }

    it('bumps version in the package.json file', async () => {
      await createPackage(instance);
      const result = await instance.bumpPackageVersion();
      assert.isTrue(result[0], 'reports package.json file changed');
      const exists = await fs.pathExists(pkgFile);
      assert.isTrue(exists, 'package.json file exists');
      const contents = await fs.readJson(pkgFile);
      assert.equal(contents.version, '1.0.1', 'increases patch version');
    });

    it('ignores package.json file when is not part of repository', async () => {
      await fs.ensureDir(instance.elementWorkingDir);
      const result = await instance.bumpPackageVersion();
      assert.isFalse(result[0], 'reports package.json file unchanged');
      pkgFile = path.join(instance.elementWorkingDir, 'package.json');
      const exists = await fs.pathExists(pkgFile);
      assert.isFalse(exists, 'package.json file does not exist');
    });

    it('ignores package-lock.json file when is not part of repository', async () => {
      await createPackage(instance);
      const result = await instance.bumpPackageVersion();
      assert.isFalse(result[1], 'reports package-lock.json file unchanged');
      const exists = await fs.pathExists(lockFile);
      assert.isFalse(exists, 'package-lock.json file does not exist');
    });

    it('bumps version in the package-clock.json file', async () => {
      await createPackage(instance);
      await createLock(instance);
      const result = await instance.bumpPackageVersion();
      assert.isTrue(result[1], 'reports package-lock.json file changed');
      const exists = await fs.pathExists(lockFile);
      assert.isTrue(exists, 'package-lock.json file exists');
      const contents = await fs.readJson(lockFile);
      assert.equal(contents.version, '1.0.1', 'increases patch version');
    });
  });

  describe('commitStage()', () => {
    let instance;
    const workingDir = __dirname;
    const org = 'advanced-rest-client';
    const componentDir = path.join(workingDir, 'test-repo');
    const changelogFile = path.join(componentDir, 'CHANGELOG.md');

    beforeEach(async () => {
      await createRepository();
      instance = new StageBuild(initInfo());
      instance.workingDir = workingDir;
      instance.git = new GitSourceControl(workingDir, org, 'test-repo');
      await instance.git.open();
    });

    afterEach(async () => {
      await fs.remove(componentDir);
    });

    it('commits changelog file', async () => {
      await fs.writeFile(changelogFile, 'chg content', 'utf8');
      await instance.commitStage(false, false);
      const commit = await instance.git.repo.getHeadCommit();
      const commitMessage = commit.message().trim();
      const expected = '[ci skip] Automated commit after stage build.';
      assert.equal(commitMessage, expected, 'message is set');
      const tree = await commit.getTree();
      assert.equal(tree.entries()[0].name(), 'CHANGELOG.md', 'has chanelog');
    });
  });

  describe('commitMaster()', () => {
    let instance;
    let changelogFile;

    before(async () => {
      instance = new StageBuild(initInfo());
      await instance.initBuild();
      await instance.cloneComponent();
      changelogFile = path.join(instance.elementWorkingDir, 'CHANGELOG.md');
    });

    beforeEach(async () => {
      await instance.git.checkoutBranch(instance.git.repo, 'stage');
      await fs.writeFile(changelogFile, 'chg content ' + Date.now(), 'utf8');
      await instance.commitStage(false, false);
    });

    it('merges changes to master', async () => {
      await instance.commitMaster();
    });
  });
});
