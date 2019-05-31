const {Changelog} = require('../apic/builds/changelog.js');
const {assert} = require('chai');
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

  describe('_getChangelogStreem()', () => {
    let instance;

    beforeEach(() => {
      instance = new Changelog(path.join(__dirname, '..'));
    });

    it('Returns a stream', () => {
      const result = instance._getChangelogStreem();
      assert.typeOf(result, 'object');
      assert.isTrue(result.readable);
    });
  });

  describe('_changelogString()', () => {
    let instance;
    let startDir;

    beforeEach(() => {
      instance = new Changelog(path.join(__dirname, '..'));
      startDir = process.cwd();
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
      return instance._changelogString()
      .then((result) => {
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

    it('Returns a promise', () => {
      const result = instance.get();
      assert.typeOf(result, 'promise');
      return result.then(() => {});
    });

    it('Resolves to a string', () => {
      return instance.get()
      .then((result) => {
        assert.typeOf(result, 'string');
      });
    });

    it('Creates CHANGELOG.md file', () => {
      return instance.get()
      .then(() => fs.exists(path.join(__dirname, '..', instance.changelogFile)))
      .then((result) => {
        assert.isTrue(result);
      });
    });
  });
});
