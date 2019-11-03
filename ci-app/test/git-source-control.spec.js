const { GitSourceControl } = require('../github/git-source-control.js');
const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');

describe('GitSourceControl', () => {
  const org = 'advanced-rest-client';
  const component = 'date-time';
  const workingDir = path.join(__dirname, 'clone-tests');
  const componentDir = path.join(workingDir, component);

  describe('cloning repository', () => {
    let instance;
    beforeEach(async () => {
      await fs.ensureDir(workingDir);
      instance = new GitSourceControl(workingDir, org, component);
    });

    afterEach(async () => {
      await fs.remove(workingDir);
    });

    it('clones into default repository using HTTP scheme', async () => {
      await instance.clone(false);
      const exists = await fs.pathExists(componentDir);
      assert.isTrue(exists, 'cloned location exists');
      const repo = instance.repo;
      assert.ok(repo, 'The repo proeprty is set');
      const ref = await repo.getCurrentBranch();
      const branch = ref.shorthand();
      assert.equal(branch, 'master');
    });

    it('clones into specified existing branch', async () => {
      await instance.clone(false, 'stage');
      const exists = await fs.pathExists(componentDir);
      assert.isTrue(exists, 'cloned location exists');
      const repo = instance.repo;
      assert.ok(repo, 'The repo proeprty is set');
      const ref = await repo.getCurrentBranch();
      const branch = ref.shorthand();
      assert.equal(branch, 'stage');
    });

    it('clones a repository using SSH', async () => {
      await instance.clone(true);
      const exists = await fs.pathExists(componentDir);
      assert.isTrue(exists, 'cloned location exists');
      const repo = instance.repo;
      assert.ok(repo, 'The repo proeprty is set');
      const ref = await repo.getCurrentBranch();
      const branch = ref.shorthand();
      assert.equal(branch, 'master');
    });
  });
});
