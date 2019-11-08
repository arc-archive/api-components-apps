const { NpmPublish, rcContents, rcFile } = require('../builds/npm-publish.js');
const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');

describe('NpmPublish', () => {
  describe('createNpmRcEntry()', () => {
    const tag = '1.0.0';
    const pkgLocation = path.join(__dirname, 'npm-publish');
    const entry = path.join(pkgLocation, rcFile);

    before(async () => {
      await fs.ensureDir(pkgLocation);
    });

    after(async () => {
      await fs.remove(pkgLocation);
    });

    afterEach(async () => {
      await fs.remove(entry);
    });

    it('creates .npmrc file', async () => {
      const publisher = new NpmPublish(pkgLocation, tag);
      await publisher.createNpmRcEntry();
      const exists = await fs.exists(entry);
      assert.isTrue(exists);
    });

    it('contains auth entry', async () => {
      const publisher = new NpmPublish(pkgLocation, tag);
      await publisher.createNpmRcEntry();
      const contents = await fs.readFile(entry, 'utf8');
      assert.include(contents, rcContents);
    });

    it('overrides entry', async () => {
      const publisher = new NpmPublish(pkgLocation, tag);
      await fs.writeFile(entry, 'test', 'utf8');
      await publisher.createNpmRcEntry();
      const contents = await fs.readFile(entry, 'utf8');
      assert.include(contents, rcContents);
    });
  });

  describe('createCommand()', () => {
    const pkgLocation = path.join(__dirname, 'npm-publish');
    it('creates a base command', () => {
      const publisher = new NpmPublish(pkgLocation, '1.0.0');
      const result = publisher.createCommand();
      assert.equal(result, 'npm publish --access public');
    });

    it('adds tag version', () => {
      const publisher = new NpmPublish(pkgLocation, '1.0.0-preview.1');
      const result = publisher.createCommand();
      assert.equal(result, 'npm publish --access public --tag preview');
    });
  });
});
