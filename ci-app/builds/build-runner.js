import EventEmitter from 'events';
import { ComponentBuildModel } from '../models/component-build-model';
import { StageBuild } from './stage-build';
import { MasterBuild } from './master-build';
import { TagBuild } from './tag-build';

export class ApicBuildRunner extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.running = false;
    this.abort = false;
    this.model = new ComponentBuildModel();
  }

  async run() {
    await this.model.startBuild(this.id);
    const info = await this.model.get(this.id);
    await this._process(info);
  }

  async _process(model) {
    switch (model.type) {
      case 'stage-build':
        return await this._buildStage(model);
      case 'master-build':
        return await this._buildMaster(model);
      case 'tag-build':
        return await this._buildTag(model);
      default:
        throw new Error('Unsupported build type.');
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
