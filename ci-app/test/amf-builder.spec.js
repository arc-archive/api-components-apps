const { AmfBuilder } = require('../test-runners/amf-builder.js');
const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');

describe('AmfBuilder', () => {
  describe('Constructor', () => {
    const wd = path.join(__dirname, 'test-component');
    const branch = 'master';
    const sha = '1234abcd';

    it('sets workingDir property', () => {
      const instance = new AmfBuilder(wd, { branch });
      assert.equal(instance.workingDir, wd);
    });

    it('sets branch property', () => {
      const instance = new AmfBuilder(wd, { branch });
      assert.equal(instance.branch, branch);
    });

    it('sets sha property', () => {
      const instance = new AmfBuilder(wd, { sha });
      assert.equal(instance.sha, sha);
    });

    it('creates storage instance', () => {
      const instance = new AmfBuilder(wd, { sha });
      assert.typeOf(instance.storage, 'object');
    });

    it('creates bucket reference', () => {
      const instance = new AmfBuilder(wd, { sha });
      assert.typeOf(instance.bucket, 'object');
    });
  });

  describe('#cacheFile', () => {
    const wd = path.join(__dirname, 'test-component');
    const branch = 'master';
    const sha = '1234abcd';

    it('throws when sha is not set', () => {
      const instance = new AmfBuilder(wd, { branch });
      assert.throws(() => {
        instance.cacheFile;
      });
    });

    it('returns cache sha', () => {
      const instance = new AmfBuilder(wd, { sha });
      assert.equal(instance.cacheFile, '1234abcd-amf-cache.tar.gz');
    });
  });

  describe('run()', () => {
    const wd = path.join(__dirname, 'test-component');
    const branch = 'release/4.0.5';

    after(async () => {
      await fs.remove(wd);
    });

    it.skip('builds AMF library', async () => {
      const instance = new AmfBuilder(wd, { branch });
      await instance.run();

      const mainFile = path.join(wd, 'lib', 'amf.js');
      const mainExists = await fs.pathExists(mainFile);
      assert.isTrue(mainExists, 'lib/amf.js exists');

      const binFile = path.join(wd, 'bin', 'amf');
      const binExists = await fs.pathExists(binFile);
      assert.isTrue(binExists, 'bin/amf exists');
    });
  });
});
