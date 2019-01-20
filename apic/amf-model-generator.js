const fs = require('fs-extra');
const path = require('path');
const {fork} = require('child_process');
const logging = require('../lib/logging');

class AmfModelGenerator {
  constructor(workingDir, component) {
    this.component = component;
    this.workingDir = workingDir;
    this.componentDir = this.workingDir + '/' + component;
  }

  generate() {
    if (!fs.pathExistsSync(this.componentDir)) {
      return Promise.reject(new Error(`The component ${this.component} do not exists.`));
    }
    const models = this.getModelsList();
    if (!models) {
      return Promise.reject(new Error(`The component ${this.component} has no "models.json" file.`));
    }
    this.models = models;
    return new Promise((resolve, reject) => {
      this._resolver = resolve;
      this._rejecter = reject;
      this._forkParser();
      this._runParser();
    });
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
        this.modeslDir = this.componentDir + '/' + locations[i][1];
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
    this.amfProc = fork(`${__dirname}/amf-parser.js`, [], options);
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
    const dest = path.join(this.modeslDir, apiFile);
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
    const api = Object.keys(this.models)[0];
    if (!api) {
      this._clearProcess();
      this._resolver();
      this._resolver = undefined;
      this._rejecter = undefined;
      return;
    }
    const source = this.modeslDir + '/' + api;
    let type = this.models[api];
    delete this.models[api];
    let mediaType;
    if (type instanceof Array) {
      mediaType = type[1];
      type = type[0];
    }
    if (!mediaType) {
      mediaType = 'application/yaml';
    }
    this.amfProc.send({
      workingDir: this.workingDir,
      source,
      mediaType,
      type
    });
  }
}

module.exports.AmfModelGenerator = AmfModelGenerator;
