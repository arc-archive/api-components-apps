const { Changelog } = require('../builds/changelog.js');
const { assert } = require('chai');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

describe('Changelog class', () => {
  describe('constructor()', () => {
    it('Sets workingDir', () => {
      const dir = './test-dir';
      const instance = new Changelog(dir);
      assert.equal(instance.workingDir, dir);
    });

    it('Sets changelogFile', () => {
      const instance = new Changelog();
      assert.equal(instance.changelogFile, 'CHANGELOG.md');
    });

    it('Sets organization', () => {
      const instance = new Changelog('a', 'b', 'c');
      assert.equal(instance.organization, 'b');
    });

    it('Sets component', () => {
      const instance = new Changelog('a', 'b', 'c');
      assert.equal(instance.component, 'c');
    });
  });

  async function createRepo() {
    const file = path.join(__dirname, 'create-test-repo.sh');
    return new Promise((resolve, reject) => {
      exec(file, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async function runUpdateGit() {
    const file = path.join(__dirname, 'update-test-repo.sh');
    return new Promise((resolve, reject) => {
      exec(file, (error, log) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  describe('get()', () => {
    let instance;
    const org = 'advanced-rest-client';
    const name = 'test-repo';
    const repoDir = path.join(__dirname, 'test-repo');

    beforeEach(async () => {
      await createRepo();
      instance = new Changelog(repoDir, org, name);
    });

    afterEach(async () => {
      await fs.remove(repoDir);
    });

    it('Gets latrest commit message', async () => {
      const result = await instance.get();
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.include(parts[0], '<a name="1.0.0"></a>', 'includes anchor');
      assert.include(parts[1], '# 1.0.0 (', 'includes header');
      assert.include(parts[2], '## Features', 'includes "features" title');
      assert.include(parts[3], '* create 1 (feat)', 'includes commit message');
      assert.include(parts[3], 'https://github.com/advanced-rest-client/test-repo/commit/', 'includes commit url');
      assert.include(parts[4], '## Bug Fixes', 'includes "Big Fixes" title');
      assert.include(parts[5], '* create 2 (fix)', 'includes bug fixes commit message');
    });
  });

  describe('build()', () => {
    const org = 'advanced-rest-client';
    const name = 'test-repo';
    const repoDir = path.join(__dirname, 'test-repo');

    before(async () => {
      await createRepo();
    });

    after(async () => {
      await fs.remove(repoDir);
    });

    let instance;
    beforeEach(() => {
      instance = new Changelog(repoDir, org, name);
    });

    afterEach(async () => {
      await fs.remove(path.join(repoDir, instance.changelogFile));
    });

    it('creates a new changelog file', async () => {
      await instance.build();
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.include(parts[0], '<a name="1.0.0"></a>', 'includes anchor');
      assert.include(parts[1], '# 1.0.0 (', 'includes header');
      assert.include(parts[2], '## Features', 'includes "features" title');
      assert.include(parts[3], '* create 1 (feat)', 'includes commit message');
      assert.include(parts[3], 'https://github.com/advanced-rest-client/test-repo/commit/', 'includes commit url');
      assert.include(parts[4], '## Bug Fixes', 'includes "Big Fixes" title');
      assert.include(parts[5], '* create 2 (fix)', 'includes bug fixes commit message');
    });

    it('updates existing changelog file', async () => {
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      await instance.build();
      await runUpdateGit();
      await instance.build();
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.include(parts[0], '<a name="1.0.0"></a>', 'includes 1.0.0 anchor');
      assert.include(parts[6], '<a name="1.0.1"></a>', 'includes 1.0.1 anchor');
      assert.include(parts[7],
          '## [1.0.1](https://github.com/advanced-rest-client/test-repo/compare/1.0.0...1.0.1) ',
          'includes release title with compare link'
      );
      assert.include(parts[8], '### Features', 'includes "Features" title');
      assert.include(parts[9], '* update 2 (feat)', 'includes commit message for features');
      assert.include(parts[10], '### Testing', 'includes "Testing" title');
      assert.include(parts[11], '* update 1 (test)', 'includes commit message for testing');
    });

    it('regenerates changelog file', async () => {
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      await instance.build();
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.include(parts[0], '<a name="1.0.0"></a>', 'includes 1.0.0 anchor');
      assert.include(parts[6], '<a name="1.0.1"></a>', 'includes 1.0.1 anchor');
      assert.include(parts[7],
          '## [1.0.1](https://github.com/advanced-rest-client/test-repo/compare/1.0.0...1.0.1) ',
          'includes release title with compare link'
      );
      assert.include(parts[8], '### Features', 'includes "Features" title');
      assert.include(parts[9], '* update 2', 'includes commit message for features');
      assert.include(parts[10], '### Testing', 'includes "Testing" title');
      assert.include(parts[11], '* update 1', 'includes commit message for testing');
    });
  });
});
