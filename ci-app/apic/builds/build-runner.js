const EventEmitter = require('events');
const { ComponentBuildModel } = require('../models/component-build-model');
const { StageBuild } = require('./stage-build');
const { MasterBuild } = require('./master-build');
const { TagBuild } = require('./tag-build');

class ApicBuildRunner extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.running = false;
    this.abort = false;
    this.model = new ComponentBuildModel();
  }

  run() {
    this.model
      .startBuild(this.id)
      .then(() => this.model.get(this.id))
      .then((info) => this._process(info));
  }

  _process(model) {
    switch (model.type) {
      case 'stage-build':
        return this._buildStage(model);
      case 'master-build':
        return this._buildMaster(model);
      case 'tag-build':
        return this._buildTag(model);
      default:
        return Promise.reject(new Error('Unsupported build type.'));
    }
  }

  _buildStage(model) {
    this.running = true;
    const runner = new StageBuild(model);
    return runner
      .build()
      .then(() => this.notifyEnd())
      .catch((cause) => this.notifyError(cause));
  }

  _buildMaster(model) {
    this.running = true;
    const runner = new MasterBuild(model);
    return runner
      .build()
      .then(() => this.notifyEnd())
      .catch((cause) => this.notifyError(cause));
  }

  _buildTag(model) {
    this.running = true;
    const runner = new TagBuild(model);
    return runner
      .build()
      .then(() => this.notifyEnd())
      .catch((cause) => this.notifyError(cause));
  }

  notifyEnd() {
    this.running = false;
    this.model
      .finishBuild(this.id)
      .catch(() => {})
      .then(() => {
        this.emit('end');
      });
  }

  notifyError(cause) {
    this.running = false;
    this.model
      .setBuildError(this.id, cause.message)
      .catch(() => {})
      .then(() => {
        this.emit('error', cause);
      });
  }
}

module.exports.ApicBuildRunner = ApicBuildRunner;
