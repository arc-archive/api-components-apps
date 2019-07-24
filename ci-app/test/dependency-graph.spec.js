const { DependencyGraph } = require('../apic/builds/dependency-graph.js');
const { assert } = require('chai');
const path = require('path');
const sinon = require('sinon');

describe('DependencyGraph class', () => {
  describe('Constructor', () => {
    let wd;
    let cmp;

    beforeEach(() => {
      wd = path.join(__dirname, 'test-component');
      cmp = 'test-component';
    });

    it('Sets component property', () => {
      const instance = new DependencyGraph(wd, cmp);
      assert.equal(instance.component, cmp);
    });

    it('Sets workingDir property', () => {
      const instance = new DependencyGraph(wd, cmp);
      assert.equal(instance.workingDir, wd);
    });

    it('Sets model property', () => {
      const instance = new DependencyGraph(wd, cmp);
      assert.typeOf(instance.model, 'object');
    });
  });

  describe('readProjectDependencies()', () => {
    it('Reads dependencies from bower.json file', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component'), 'test-component');
      return instance.readProjectDependencies().then((result) => {
        assert.typeOf(result, 'array', 'Resolves to an array');
        assert.lengthOf(result, 2, 'The array has 2 items');
        assert.deepEqual(
          Object.keys(result[0]),
          ['polymer', 'api-endpoint-documentation', 'api-type-documentation'],
          'Has dependencies'
        );
        assert.deepEqual(
          Object.keys(result[1]),
          ['iron-demo-helpers', 'iron-component-page', 'arc-polyfills', 'oauth-authorization'],
          'Has dev dependencies'
        );
      });
    });

    it('Reads dependencies from package.json file', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component-esm'), 'test-component');
      return instance.readProjectDependencies().then((result) => {
        assert.typeOf(result, 'array', 'Resolves to an array');
        assert.lengthOf(result, 2, 'The array has 2 items');
        assert.deepEqual(
          Object.keys(result[0]),
          ['@polymer/polymer', '@advanced-rest-client/api-test1', '@api-components/api-test2'],
          'Has dependencies'
        );
        assert.deepEqual(
          Object.keys(result[1]),
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
  });

  describe('filterDependencies()', () => {
    it('Filters bower dependencies', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component'), 'test-component');
      return instance.readProjectDependencies().then((data) => {
        const result = instance.filterDependencies(data[0]);
        assert.deepEqual(result, ['api-endpoint-documentation', 'api-type-documentation'], 'Has dependencies');
        const devResult = instance.filterDependencies(data[1]);
        assert.deepEqual(devResult, ['arc-polyfills', 'oauth-authorization'], 'Has dev dependencies');
      });
    });

    it('Filters package dependencies', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component-esm'), 'test-component');
      return instance.readProjectDependencies().then((data) => {
        const result = instance.filterDependencies(data[0]);
        assert.deepEqual(result, ['@advanced-rest-client/api-test1', '@api-components/api-test2'], 'Has dependencies');
        const devResult = instance.filterDependencies(data[1]);
        assert.deepEqual(
          devResult,
          ['@advanced-rest-client/arc-test1', '@api-components/arc-test2'],
          'Has dev dependencies'
        );
      });
    });
  });

  describe('buildGraph()', () => {
    it('Builds graph for bower components', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component'), 'test-component');
      instance.model.set = () => {};
      const spy = sinon.spy(instance.model, 'set');
      return instance.buildGraph().then(() => {
        assert.equal(spy.args[0][0], 'test-component', 'Stores component name');
        assert.deepEqual(
          spy.args[0][1],
          ['api-endpoint-documentation', 'api-type-documentation'],
          'Stores dependencies'
        );
        assert.deepEqual(spy.args[0][2], ['arc-polyfills', 'oauth-authorization'], 'Stores dev dependencies');
      });
    });

    it('Builds graph for ESM components', () => {
      const instance = new DependencyGraph(path.join(__dirname, 'test-component-esm'), 'test-component');
      instance.model.set = () => {};
      const spy = sinon.spy(instance.model, 'set');
      return instance.buildGraph().then(() => {
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
});
