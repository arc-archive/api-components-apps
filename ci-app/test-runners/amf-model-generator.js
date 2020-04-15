import fs from 'fs-extra';
import path from 'path';
import { fork } from 'child_process';
import logging from '../lib/logging.js';

/**
 * @typedef APIProcessingOptions
 * @property {String} type API type to process. Can be `RAML 0.8`, `RAML 1.0`, `OAS 2.0`, or `OAS 3.0`.
 * @property {String} [mime=application/yaml] API media type.
 * @property {String} [resolution=editing] AMF resolution pipeline.
 */

/**
 * A class representing a model definition in `apis.json` file.
 * The file contains a map of API file location to API spec type.
 * API spec type can be an array where first item is the spec type and second
 * is API media type. If media type is missing it is determined from API file
 * extension.
 */
export class ModelEntry {
  /**
   * @param {String} file API file location
   * @param {APIProcessingOptions|Array|String} opts API processing options
   * Note, the Array and String type is deprecated. Use `APIProcessingOptions`
   * instead.
   */
  constructor(file, opts) {
    this.file = file;
    this.opts = opts;
  }
  /**
   * @return {String} API spec type (RAML/OAS)
   */
  get type() {
    const { opts } = this;
    if (Array.isArray(opts)) {
      return opts[0];
    }
    if (typeof opts === 'string') {
      return opts;
    }
    return opts.type;
  }
  /**
   * @return {String} API spec media type type: `application/json` or `application/yaml`
   */
  get mime() {
    const { opts } = this;
    if (Array.isArray(opts)) {
      return this.opts[1];
    }
    if (typeof opts === 'string') {
      if (this.file.indexOf('.json') !== -1) {
        return 'application/json';
      }
    }
    if (opts.mime) {
      return opts.mime;
    }
    return 'application/yaml';
  }
  /**
   * @return {String} AMF resolution pipeline. Default to `editing` which is the
   * original resolution pipeline for API Console. Future releases of
   * AMF can support different options.
   */
  get resolution() {
    const { opts } = this;
    if (opts.resolution) {
      return opts.resolution;
    }
    return 'editing';
  }
}
/**
 * A class to generate AMF model from APIs in API component definition.
 * Each AMF processing component has `apis.json` in `demo/` or `test/` folder.
 * It contains a list of APIs to process.
 */
export class AmfModelGenerator {
  /**
   * @param {String} workingDir
   * @param {String} component
   */
  constructor(workingDir, component) {
    /**
     * Processed component name
     * @type {String}
     */
    this.component = component;
    /**
     * Current working directory
     * @type {String}
     */
    this.workingDir = workingDir;
    /**
     * A full path to the component location.
     * @type {String}
     */
    this.componentDir = path.join(this.workingDir, component);
    /**
     * A map of APIs to process.
     * @type {Array<ModelEntry>}
     */
    this.models = null;
  }

  /**
   * Generates API models from repository's apis.json file.
   * @return {Promise} Promise resolved when models are created.
   */
  async generate() {
    const { componentDir, component } = this;
    if (!fs.pathExistsSync(componentDir)) {
      throw new Error(`The component ${component} do not exists.`);
    }
    const models = await this.getModelsList();
    if (!models) {
      throw new Error(`The component ${component} has no "models.json" file.`);
    }
    this._setupModelsData(models);
    return new Promise((resolve, reject) => {
      this._resolver = resolve;
      this._rejecter = reject;
      this._forkParser();
      this._runParser();
    });
  }
  /**
   * The function looks for `src` and `dest` properties in the APIs definitions
   * and sets `modelSrcBase` and `modelDestBase` from either configuration from `apis.json`
   * file or `modelsDir` set by `getModelsList()`` function.
   * @param {Object} models List of models to generate for the component.
   */
  _setupModelsData(models) {
    const [cnfFiles, cnfOpts] = this._prepareFile(models);
    if (cnfOpts.src) {
      this.modelSrcBase = path.join(this.componentDir, cnfOpts.src);
    } else {
      this.modelSrcBase = this.modelsDir;
    }
    if (cnfOpts.dest) {
      this.modelDestBase = path.join(this.componentDir, cnfOpts.dest);
      delete models.dest;
    } else {
      this.modelDestBase = this.modelsDir;
    }
    this.models = cnfFiles;
  }

  /**
   * Creates a Map with definitions from the apis.json file.
   * The keys are paths to the API file relative to `opts.src` and values is
   * API type.
   * @param {Object} data Definition from apis.json file.
   * @return {Array} First item is the files map and second build configuration if any.
   */
  _prepareFile(data) {
    const files = [];
    const opts = {};
    Object.keys(data).forEach((key) => {
      switch (key) {
        case 'src':
        case 'dest':
          opts[key] = data[key];
          break;
        default:
          files.push(new ModelEntry(key, data[key]));
          break;
      }
    });
    return [files, opts];
  }

  /**
   * Reads definition for generating API models from usual locations.
   * This function sets `modelsDir` when it finds the definition file.
   * @return {Promise<Object>} Promise resolved to parsed contents of the file.
   */
  async getModelsList() {
    const { componentDir } = this;
    const locations = [
      [componentDir + '/demo/api.json', 'demo'],
      [componentDir + '/demo/apis.json', 'demo'],
      [componentDir + '/demo/models.json', 'demo'],
      [componentDir + '/test/api.json', 'test'],
      [componentDir + '/test/apis.json', 'test'],
      [componentDir + '/test/models.json', 'test']
    ];

    for (let i = 0, len = locations.length; i < len; i++) {
      const exists = await fs.pathExists(locations[i][0]);
      if (exists) {
        this.modelsDir = path.join(componentDir, locations[i][1]);
        try {
          return await fs.readJson(locations[i][0]);
        } catch (cause) {
          logging.error('Failed to load model definitions.');
          logging.error(cause);
        }
      }
    }
  }

  /**
   * Creates a fork for amf parser.
   */
  _forkParser() {
    const options = {
      execArgv: []
    };
    this.amfProc = fork(`${__dirname}/amf-parser.js`, ['--working-dir', this.workingDir], options);
    this.amfProc.on('message', (result) => {
      if (result.error) {
        this._resultError(result.error);
      } else {
        this._runParser();
      }
    });

    this.amfProc.on('error', (error) => {
      this._resultError(error);
    });
  }

  _clearProcess() {
    if (this.amfProc) {
      this.amfProc.kill();
      this.amfProc = undefined;
    }
  }

  _resultError(error) {
    this._clearProcess();
    if (typeof error === 'string') {
      error = new Error(error);
    }
    this._rejecter(error);
    this._resolver = undefined;
    this._rejecter = undefined;
  }

  _getApiStoreBaseName(file) {
    let apiFile = path.basename(file);
    apiFile = apiFile.substr(0, apiFile.lastIndexOf('.'));
    return path.join(this.modelDestBase, apiFile);
  }

  _runParser() {
    const api = this.models.shift();
    if (!api) {
      this._clearProcess();
      this._resolver();
      this._resolver = undefined;
      this._rejecter = undefined;
      return;
    }
    const source = path.join(this.modelSrcBase, api.file);
    const destBase = this._getApiStoreBaseName(api.file);
    const { mime, type, resolution } = api;
    this.amfProc.send({
      source,
      destBase,
      mime,
      type,
      resolution,
    });
  }
}
