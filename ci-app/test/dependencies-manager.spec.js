const { DependendenciesManager } = require('../test-runners/dependencies-manager.js');
const { assert } = require('chai');
const path = require('path');
const fs = require('fs-extra');

describe('DependendenciesManager', () => {
  const source = path.join(__dirname, 'test-component-karma');
  const dest = path.join(__dirname, 'dependency-test');
  beforeEach(async () => {
    await fs.copy(source, dest);
  });
  afterEach(async () => {
    await fs.remove(dest);
  });

  it('installs dependencies in a repository', async () => {
    const instance = new DependendenciesManager(dest);
    await instance.installDependencies();
    const depFolder = path.join(dest, 'node_modules', 'lit-element');
    const depExists = await fs.pathExists(depFolder);
    assert.isTrue(depExists, 'dependency is installed');
    const devFolder = path.join(dest, 'node_modules', 'karma');
    const devExists = await fs.pathExists(devFolder);
    assert.isTrue(devExists, 'dev dependency is installed');
  });

  it('installs extra dependencies', async () => {
    const instance = new DependendenciesManager(dest);
    await instance.installDependencies({
      component: 'date-time',
      branch: 'master',
      pkgName: '@advanced-rest-client/date-time'
    });
    const depFolder = path.join(dest, 'node_modules', '@advanced-rest-client', 'date-time');
    const depExists = await fs.pathExists(depFolder);
    assert.isTrue(depExists, 'dependency is installed');
  });
});
