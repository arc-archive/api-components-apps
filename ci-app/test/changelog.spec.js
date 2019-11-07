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

    it('Sets startDir', () => {
      const instance = new Changelog();
      assert.equal(instance.startDir, process.cwd());
    });
  });

  describe('_getChangelogStream()', () => {
    let instance;

    beforeEach(() => {
      instance = new Changelog(path.join(__dirname, '..'));
    });

    it('Returns a stream', () => {
      const result = instance._getChangelogStream();
      assert.typeOf(result, 'object');
      assert.isTrue(result.readable);
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

  describe('_changelogString()', () => {
    let instance;
    let startDir;

    before(async () => {
      await createRepo();
    });

    after(async () => {
      await fs.remove(path.join(__dirname, 'test-repo'));
    });

    beforeEach(() => {
      startDir = process.cwd();
      instance = new Changelog(path.join(__dirname, 'test-repo'));
      process.chdir(instance.workingDir);
    });

    afterEach(() => {
      process.chdir(startDir);
    });

    it('Returns a promise', () => {
      const result = instance._changelogString();
      assert.typeOf(result, 'promise');
      return result.then(() => {});
    });

    it('Resolves to a string', () => {
      return instance._changelogString().then((result) => {
        assert.typeOf(result, 'string');
      });
    });
  });

  describe('get()', () => {
    let instance;
    let startDir;

    beforeEach(() => {
      startDir = process.cwd();
      instance = new Changelog(path.join(__dirname, '..'));
    });

    afterEach(() => {
      process.chdir(startDir);
      return fs.remove(path.join(__dirname, '..', instance.changelogFile));
    });

    it('resolves to a string', async () => {
      const result = await instance.get();
      assert.typeOf(result, 'string');
    });

    it('Creates CHANGELOG.md file', () => {
      return instance
          .get()
          .then(() => fs.exists(path.join(__dirname, '..', instance.changelogFile)))
          .then((result) => {
            assert.isTrue(result);
          });
    });
  });

  describe.only('build()', () => {
    const repoDir = path.join(__dirname, 'test-repo');

    before(async () => {
      await createRepo();
    });

    after(async () => {
      await fs.remove(repoDir);
    });

    let instance;
    beforeEach(() => {
      instance = new Changelog(repoDir);
    });

    afterEach(async () => {
      await fs.remove(path.join(repoDir, instance.changelogFile));
    });

    it('creates a new changelog file', async () => {
      await instance.build();
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.notEqual(parts[0].indexOf('# 1.0.0'), -1);
      assert.notEqual(parts[1].indexOf('### Bug Fixes'), -1);
      assert.notEqual(parts[2].indexOf('* adding package.json file'), -1);
      assert.notEqual(parts[3].indexOf('### Features'), -1);
      assert.notEqual(parts[4].indexOf('* adding test message'), -1);
    });

    it.only('updates existing changelog file', async () => {
      await instance.updateChangelog();
      // const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      // await instance.build();
      // console.log(await fs.readFile(file, 'utf8'));
      // console.log(' ');
      // await runUpdateGit();
      // await instance.build();
      // const result = await fs.readFile(file, 'utf8');
      // console.log(result);
      // const parts = result.split('\n').filter((item) => !!item.trim());
      // assert.notEqual(parts[0].indexOf('# 1.0.0'), -1);
      // assert.notEqual(parts[1].indexOf('### Bug Fixes'), -1);
      // assert.notEqual(parts[2].indexOf('* adding package.json file'), -1);
      // assert.notEqual(parts[3].indexOf('### Features'), -1);
      // assert.notEqual(parts[4].indexOf('* adding test message'), -1);
    });
  });

  describe('Generating changelog', () => {
    before((done) => {
      const file = path.join(__dirname, 'create-test-repo.sh');
      exec(file, (error) => {
        if (error) {
          done(error);
        } else {
          done();
        }
      });
    });

    after(async () => {
      await fs.remove(path.join(__dirname, 'test-repo'));
    });

    let instance;
    let startDir;

    beforeEach(() => {
      startDir = process.cwd();
      instance = new Changelog(path.join(__dirname, 'test-repo'));
      process.chdir(instance.workingDir);
    });

    afterEach(async () => {
      process.chdir(startDir);
      await fs.remove(path.join(__dirname, 'test-repo', 'CHANGELOG.md'));
    });

    it('Generates the changelog string', async () => {
      const result = await instance._changelogString();
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.notEqual(parts[0].indexOf('# 1.0.0'), -1);
      assert.notEqual(parts[1].indexOf('### Bug Fixes'), -1);
      assert.notEqual(parts[2].indexOf('* adding package.json file'), -1);
      assert.notEqual(parts[3].indexOf('### Features'), -1);
      assert.notEqual(parts[4].indexOf('* adding test message'), -1);
    });

    it('Creates changelog', async () => {
      await instance.build();
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.notEqual(parts[0].indexOf('# 1.0.0'), -1);
      assert.notEqual(parts[1].indexOf('### Bug Fixes'), -1);
      assert.notEqual(parts[2].indexOf('* adding package.json file'), -1);
      assert.notEqual(parts[3].indexOf('### Features'), -1);
      assert.notEqual(parts[4].indexOf('* adding test message'), -1);
    });

    it('Updates changelog', async () => {
      await instance.build();
      const file = path.join(__dirname, 'test-repo', 'CHANGELOG.md');
      await runUpdateGit();
      await instance.build();
      const result = await fs.readFile(file, 'utf8');
      const parts = result.split('\n').filter((item) => !!item.trim());
      assert.notEqual(parts[0].indexOf('# 1.0.0'), -1);
      assert.notEqual(parts[5].indexOf('# 1.0.1'), -1);
      assert.notEqual(parts[6].indexOf('### Bug Fixes'), -1);
      assert.notEqual(parts[7].indexOf('* adding package.json file'), -1);
      assert.notEqual(parts[8].indexOf('### Features'), -1);
      assert.notEqual(parts[9].indexOf('* adding test message'), -1);
    });
  });
});
