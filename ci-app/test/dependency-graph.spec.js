const { DependencyGraph } = require('../builds/dependency-graph.js');
const { assert } = require('chai');
const path = require('path');
const sinon = require('sinon');

describe('DependencyGraph class', () => {
  const org = 'advanced-rest-client';
  const esmComponent = path.join(__dirname, 'test-component-esm');

  describe('Constructor', () => {
    let wd;
    let cmp;

    beforeEach(() => {
      wd = path.join(__dirname, 'test-component');
      cmp = 'test-component';
    });

    it('Sets component property', () => {
      const instance = new DependencyGraph(wd, org, cmp);
      assert.equal(instance.component, cmp);
    });

    it('Sets workingDir property', () => {
      const instance = new DependencyGraph(wd, org, cmp);
      assert.equal(instance.workingDir, wd);
    });

    it('Sets model property', () => {
      const instance = new DependencyGraph(wd, org, cmp);
      assert.typeOf(instance.model, 'object');
    });
  });

  describe('readPackage()', () => {
    it('returns package contents', async () => {
      const instance = new DependencyGraph(esmComponent, org, 'test-component');
      const pkg = await instance.readPackage();
      assert.typeOf(pkg, 'object', 'returns an object');
      assert.equal(pkg.name, 'test-component', 'has component name');
    });
  });

  describe('readProjectDependencies()', () => {
    it('reads list of depencnecies', async () => {
      const instance = new DependencyGraph(esmComponent, org, 'test-component');
      const pkg = await instance.readPackage();
      const [deps] = await instance.readProjectDependencies(pkg);
      assert.deepEqual(
        Object.keys(deps),
        ['@polymer/polymer', '@advanced-rest-client/api-test1', '@api-components/api-test2'],
        'Has dependencies'
      );
    });

    it('reads list of dev depencnecies', async () => {
      const instance = new DependencyGraph(esmComponent, org, 'test-component');
      const pkg = await instance.readPackage();
      const [deps, dev] = await instance.readProjectDependencies(pkg);
      assert.ok(deps);
      assert.deepEqual(
        Object.keys(dev),
        [
          '@polymer/iron-demo-helpers',
          '@polymer/iron-component-page',
          '@advanced-rest-client/arc-test1',
          '@api-components/arc-test2'
        ],
        'Has dev dependencies'
      );
    });
  });

  describe('filterDependencies()', () => {
    async function getDependencies(instance) {
      const pkg = await instance.readPackage();
      return await instance.readProjectDependencies(pkg);
    }

    it('Filters package dependencies', async () => {
      const instance = new DependencyGraph(esmComponent, org, 'test-component');
      const [deps, dev] = await getDependencies(instance);
      const result = instance.filterDependencies(deps);
      assert.deepEqual(result, ['@advanced-rest-client/api-test1', '@api-components/api-test2'], 'Has dependencies');
      const devResult = instance.filterDependencies(dev);
      assert.deepEqual(
        devResult,
        ['@advanced-rest-client/arc-test1', '@api-components/arc-test2'],
        'Has dev dependencies'
      );
    });
  });

  describe('buildGraph()', () => {
    it('builds graph for a component', async () => {
      const instance = new DependencyGraph(esmComponent, org, 'test-component');
      instance.model.set = () => {};
      const spy = sinon.spy(instance.model, 'set');
      await instance.buildGraph();
      assert.equal(spy.args[0][0], 'test-component', 'Stores component name');
      assert.deepEqual(
        spy.args[0][1],
        ['@advanced-rest-client/api-test1', '@api-components/api-test2'],
        'Stores dependencies'
      );
      assert.deepEqual(
        spy.args[0][2],
        ['@advanced-rest-client/arc-test1', '@api-components/arc-test2'],
        'Stores dev dependencies'
      );
    });
  });
});
