const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const npm = require('npm');
const { KarmaTestRunner } = require('../test-runners/karma-test-runner.js');

describe('KarmaTestRunner', () => {
  const org = 'advanced-rest-client';
  const component = 'test-component';
  const pkgName = '@advanced-rest-client/test-component';
  const esmComponent = path.join(__dirname, 'test-component-karma');

  async function setPackageFile() {
    const pkgFile = path.join(esmComponent, 'package.json');
    const pkgFileTpl = path.join(esmComponent, 'package-tpl.json');
    await fs.remove(pkgFile);
    await fs.copy(pkgFileTpl, pkgFile);
  }

  function installDependencies() {
    return new Promise((resolve, reject) => {
      npm.load({
        'loaded': false,
        'progress': false,
        'no-audit': true
      }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        npm.commands.install(esmComponent, [], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  before(async () => {
    await setPackageFile();
    await installDependencies();
  });

  describe('constructor()', () => {
    it('sets "org"', () => {
      const instance = new KarmaTestRunner(org, component, pkgName);
      assert.equal(instance.org, org);
    });

    it('sets "component"', () => {
      const instance = new KarmaTestRunner(org, component, pkgName);
      assert.equal(instance.component, component);
    });

    it('sets "compkgNameponent"', () => {
      const instance = new KarmaTestRunner(org, component, pkgName);
      assert.equal(instance.pkgName, pkgName);
    });

    it('sets "repoName"', () => {
      const instance = new KarmaTestRunner(org, component, pkgName);
      assert.equal(instance.repoName, `${org}/${component}`);
    });

    it('sets "testConfig"', () => {
      const testConfig = { test: true };
      const instance = new KarmaTestRunner(org, component, pkgName, testConfig);
      assert.equal(instance.testConfig, testConfig);
    });
  });

  describe('createConfig()', () => {
    let instance;
    let origPath;
    before(() => {
      instance = new KarmaTestRunner(org, component, pkgName);
      origPath = process.cwd();
      process.chdir(esmComponent);
    });

    after(async () => {
      process.chdir(origPath);
      await setPackageFile();
    });

    it('adds the reporter', async () => {
      const result = await instance.createConfig();
      assert.include(result.reporters, 'arcci');
    });

    it('adds the plugin', async () => {
      const result = await instance.createConfig();
      const plugin = result.plugins.find((plugin) => {
        if (typeof plugin !== 'object') {
          return false;
        }
        const keys = Object.keys(plugin);
        return keys.indexOf('reporter:arcci') !== -1;
      });
      assert.ok(plugin);
    });
  });

  describe('_run()', () => {
    let instance;
    let testConfig;
    before(() => {
      testConfig = {
        type: 'amf-build'
      };
      instance = new KarmaTestRunner(org, component, pkgName, testConfig);
      instance.componentDir = esmComponent;
    });

    after(async () => {
      await setPackageFile();
    });

    it('performs the test', async () => {
      const result = await instance._run();
      assert.typeOf(result, 'object');
      assert.typeOf(result.total, 'number');
      assert.typeOf(result.success, 'number');
      assert.typeOf(result.failed, 'number');
      assert.typeOf(result.skipped, 'number');
      assert.typeOf(result.error, 'boolean');
      assert.typeOf(result.results, 'array');
      const item = result.results[0];
      assert.typeOf(item.browser, 'string');
      assert.typeOf(item.startTime, 'number');
      assert.typeOf(item.endTime, 'number');
      assert.typeOf(item.total, 'number');
      assert.typeOf(item.success, 'number');
      assert.typeOf(item.failed, 'number');
      assert.typeOf(item.skipped, 'number');
      assert.typeOf(item.error, 'boolean');
      assert.typeOf(item.logs, 'array');
    });
  });
});
