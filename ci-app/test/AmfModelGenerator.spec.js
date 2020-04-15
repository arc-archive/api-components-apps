import { assert } from 'chai';
import path from 'path';
import fs from 'fs-extra';
import { AmfModelGenerator, ModelEntry } from '../test-runners/amf-model-generator.js';

describe('AmfModelGenerator', () => {
  const workingDir = path.join(__dirname, 'test-playground');
  const component = 'test-component';
  const componentDir = path.join(workingDir, component);

  describe('constructor()', () => {
    it('sets component proeprty', () => {
      const instance = new AmfModelGenerator(workingDir, component);
      assert.equal(instance.component, component);
    });

    it('sets workingDir proeprty', () => {
      const instance = new AmfModelGenerator(workingDir, component);
      assert.equal(instance.workingDir, workingDir);
    });

    it('sets componentDir proeprty', () => {
      const instance = new AmfModelGenerator(workingDir, component);
      assert.equal(instance.componentDir, componentDir);
    });

    it('models are not processed', () => {
      const instance = new AmfModelGenerator(workingDir, component);
      assert.notOk(instance.models);
    });
  });

  describe('getModelsList()', () => {
    let instance;
    beforeEach(async () => {
      await fs.ensureDir(componentDir);
      instance = new AmfModelGenerator(workingDir, component);
    });

    afterEach(async () => {
      await fs.remove(workingDir);
    });

    const apis = {
      'my/api.raml': { type: 'RAML 1.0' }
    };

    [
      ['demo/api.json', 'demo'],
      ['demo/apis.json', 'demo'],
      ['demo/models.json', 'demo'],
      ['test/api.json', 'test'],
      ['test/apis.json', 'test'],
      ['test/models.json', 'test']
    ].forEach(([filePath, base]) => {
      it(`reads data from ${filePath}`, async () => {
        const file = path.join(componentDir, filePath);
        await fs.outputJson(file, apis);
        const result = await instance.getModelsList();
        assert.deepEqual(result, apis);
      });

      it(`sets modelsDir for ${filePath}`, async () => {
        const file = path.join(componentDir, filePath);
        await fs.outputJson(file, apis);
        await instance.getModelsList();
        assert.equal(instance.modelsDir, path.join(componentDir, base));
      });
    });

    it('returns undefined when cannot locate the file', async () => {
      const result = await instance.getModelsList();
      assert.isUndefined(result);
    });
  });

  describe('_prepareFile()', () => {
    const apis = {
      'my/api.raml': { type: 'RAML 1.0' },
      'my/api.json': { type: 'OAS 3.0', mime: 'application/json' },
    };

    let instance;
    beforeEach(async () => {
      instance = new AmfModelGenerator(workingDir, component);
    });

    it('returns an array with two items', () => {
      const result = instance._prepareFile({ ...apis });
      assert.typeOf(result, 'array', 'returns an array');
      const [files, opts] = result;
      assert.typeOf(files, 'array', 'first item is an array');
      assert.typeOf(opts, 'object', 'second item is an array');
    });

    it('has instances of ModelEntry on files', () => {
      const result = instance._prepareFile({ ...apis });
      const [files] = result;
      assert.isTrue(files[0] instanceof ModelEntry, 'File 1 is ModelEntry');
      assert.isTrue(files[1] instanceof ModelEntry, 'File 2 is ModelEntry');
    });

    it('adds "src" configuration option', () => {
      const src = 'test-src';
      const opts = instance._prepareFile({ ...apis, src })[1];
      assert.equal(opts.src, src);
    });

    it('adds "dest" configuration option', () => {
      const dest = 'test-dest';
      const opts = instance._prepareFile({ ...apis, dest })[1];
      assert.equal(opts.dest, dest);
    });
  });

  describe('_setupModelsData()', () => {
    const apis = {
      'my/api.raml': { type: 'RAML 1.0' },
      'my/api.json': { type: 'OAS 3.0', mime: 'application/json' },
    };
    const modelsDir = 'default-dir';

    let instance;
    beforeEach(async () => {
      instance = new AmfModelGenerator(workingDir, component);
      instance.modelsDir = modelsDir;
    });

    it('sets default modelSrcBase', () => {
      instance._setupModelsData({ ...apis });
      assert.equal(instance.modelSrcBase, modelsDir);
    });

    it('sets default modelDestBase', () => {
      instance._setupModelsData({ ...apis });
      assert.equal(instance.modelDestBase, modelsDir);
    });

    it('sets set modelSrcBase', () => {
      const src = 'test-src';
      instance._setupModelsData({ ...apis, src });
      assert.equal(instance.modelSrcBase, path.join(componentDir, src));
    });

    it('sets set modelDestBase', () => {
      const dest = 'test-dest';
      instance._setupModelsData({ ...apis, dest });
      assert.equal(instance.modelDestBase, path.join(componentDir, dest));
    });

    it('sets "models" array', () => {
      instance._setupModelsData({ ...apis });
      assert.typeOf(instance.models, 'array', 'property is set');
      assert.lengthOf(instance.models, 2, 'has all files');
    });
  });

  describe('generate()', () => {
    let instance;
    const demoPath = path.join(componentDir, 'demo');
    beforeEach(async () => {
      await fs.ensureDir(demoPath);
      instance = new AmfModelGenerator(workingDir, component);
      const src = path.join(__dirname, 'amf-build', 'amf.js');
      const desc = path.join(workingDir, 'lib', 'amf.js');
      await fs.copy(src, desc);
    });

    afterEach(async () => {
      await fs.remove(workingDir);
    });

    const apis = {
      'raml/raml-api.raml': { type: 'RAML 1.0' },
      'json-oas/json-oas-api.json': { type: 'OAS 2.0', mime: 'application/json' },
    };

    async function createRamlFile() {
      const content = `#%RAML 1.0
title: API body demo
version: v1
baseUri: http://domain.com/`;
      await fs.ensureDir(path.join(componentDir, 'demo', 'raml'));
      const file = path.join(componentDir, 'demo', 'raml/raml-api.raml');
      await fs.writeFile(file, content, 'utf8');
    }

    async function createOasJsonFile() {
      const content = {
        swagger: '2.0',
        info: {
          description: 'test'
        }
      };
      await fs.ensureDir(path.join(componentDir, 'demo', 'json-oas'));
      const file = path.join(componentDir, 'demo', 'json-oas/json-oas-api.json');
      await fs.outputJson(file, content);
    }

    async function createDefinitionFile(data=apis) {
      const file = path.join(componentDir, 'demo', 'apis.json');
      await fs.outputJson(file, { ...data });
    }

    it('generates api files in default location', async () => {
      await createDefinitionFile();
      await createRamlFile();
      await createOasJsonFile();
      await instance.generate();
      const ramlPath = path.join(componentDir, 'demo', 'raml-api.json');
      const ramlExists = await fs.pathExists(ramlPath);
      assert.isTrue(ramlExists, 'RAML model exists');
      const oasPath = path.join(componentDir, 'demo', 'json-oas-api.json');
      const oasExists = await fs.pathExists(oasPath);
      assert.isTrue(oasExists, 'OAS model exists');
    });

    it('throws when unable to parse a file', async () => {
      let called = false;
      const cp = { ...apis };
      cp['json-oas/json-oas-api.json'] = { type: 'OAS 3.0', mime: 'application/json' };
      await createDefinitionFile(cp);
      await createRamlFile();
      await createOasJsonFile();
      try {
        await instance.generate();
      } catch (e) {
        called = true;
      }
      assert.isTrue(called);
    });

    it('throws when unable to find api a file', async () => {
      let called = false;
      await createDefinitionFile();
      await createRamlFile();
      try {
        await instance.generate();
      } catch (e) {
        called = true;
      }
      assert.isTrue(called);
    });
  });
});
