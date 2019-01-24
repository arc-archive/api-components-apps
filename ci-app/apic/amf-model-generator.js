const fs = require('fs-extra');
const path = require('path');
const {fork} = require('child_process');
const logging = require('../lib/logging');
/**
 * A class representing a model definition in `apis.json` file.
 * The file contains a map of API file location to API spec type.
 * API spec type can be an array where first item is the spec type and second
 * is API media type. If media type is missing it is determined from API file
 * extension.
 */
class ModelEntry {
  /**
   * @param {String} file API file location
   * @param {Array|String} type API spec type (string) or array where first item is
   * API spec type and second is API spec file media type.
   */
  constructor(file, type) {
    this.file = file;
    this._type = type;
  }
  /**
   * @return {String} API spec type (RAML/OAS)
   */
  get type() {
    if (this._type instanceof Array) {
      return this._type[0];
    }
    return this._type;
  }
  /**
   * @return {String} API spec media type type: `application/json` or `application/yaml`
   */
  get mediaType() {
    if (this._type instanceof Array) {
      return this._type[1];
    }
    if (this.file.indexOf('.json') !== -1) {
      return 'application/json';
    }
    return 'application/yaml';
  }
}

class AmfModelGenerator {
  constructor(workingDir, component) {
    this.component = component;
    this.workingDir = workingDir;
    this.componentDir = path.join(this.workingDir, component);
  }

  generate() {
    if (!fs.pathExistsSync(this.componentDir)) {
      return Promise.reject(new Error(`The component ${this.component} do not exists.`));
    }
    const models = this.getModelsList();
    if (!models) {
      return Promise.reject(new Error(`The component ${this.component} has no "models.json" file.`));
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
   * file or `modeslDir` set by `getModelsList()`` function.
   * @param {Object} models List of models to generate for the component.
   */
  _setupModelsData(models) {
    const keys = Object.keys(models);
    let src;
    let dest;
    const result = [];
    for (let i = 0, len = keys.length; i < len; i++) {
      const prop = keys[i];
      switch (prop) {
        case 'src': src = models[prop]; break;
        case 'dest': dest = models[prop]; break;
        default:
          result.push(new ModelEntry(prop, models[prop]));
          break;
      }
    }
    if (src) {
      this.modelSrcBase = path.join(this.componentDir, src);
      delete models.src;
    } else {
      this.modelSrcBase = this.modeslDir;
    }
    if (dest) {
      this.modelDestBase = path.join(this.componentDir, dest);
      delete models.dest;
    } else {
      this.modelDestBase = this.modeslDir;
    }
    this.models = result;
  }

  getModelsList() {
    const locations = [
      [this.componentDir + '/demo/apis.json', 'demo'],
      [this.componentDir + '/demo/models.json', 'demo'],
      [this.componentDir + '/test/apis.json', 'test'],
      [this.componentDir + '/test/models.json', 'test']
    ];

    for (let i = 0, len = locations.length; i < len; i++) {
      if (fs.pathExistsSync(locations[i][0])) {
        this.modeslDir = path.join(this.componentDir, locations[i][1]);
        try {
          return fs.readJsonSync(locations[i][0], {throws: false});
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
        this._storeModel(result.api, result.source);
        this._runParser();
      }
    });

    this.amfProc.on('error', (error) => {
      this._resultError(error);
    });
  }

  _storeModel(model, file) {
    let apiFile = path.basename(file);
    apiFile = apiFile.substr(0, apiFile.lastIndexOf('.')) + '.json';
    const dest = path.join(this.modelDestBase, apiFile);
    logging.verbose('Storing API model to ' + dest);
    fs.outputFileSync(dest, model);
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
    this.amfProc.send({
      source,
      mediaType: api.mediaType,
      type: api.type
    });
  }
}

module.exports.AmfModelGenerator = AmfModelGenerator;