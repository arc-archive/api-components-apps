import path from 'path';
import Git from 'nodegit';
import logging from '../lib/logging';
import { Changelog } from './changelog';
import { BaseBuild } from './base-build';
import { GitSourceControl } from '../github/git-source-control.js';
import { getScopeAndName, nonElements } from './utils.js';
import { VersionBump } from './VersionBump.js';
/**
 * A class responsible for processing "stage" branch after successfult stage build.
 */
export class StageBuild extends BaseBuild {
  constructor(info) {
    super();
    this.info = info;
    const { org, component, bumpVersion } = info;
    const [scope, name] = getScopeAndName(component);
    this.name = name;
    this.scope = scope;
    this.organization = org;
    this.bumpVersion = bumpVersion === true;
  }

  /**
   * After cloning the component that actual working dir is the component
   * directory which is current working dir + component name
   * @return {String}
   */
  get elementWorkingDir() {
    return path.join(this.workingDir, this.name);
  }
  /**
   * Initializes two prpoerties: `workingDir` and `git`.
   * Must be called before any other function.
   * @return {Promise}
   */
  async initBuild() {
    this.workingDir = await this.createWorkingDir();
    this.git = new GitSourceControl(this.workingDir, this.organization, this.name);
  }

  async build() {
    if (nonElements.indexOf(this.name) !== -1) {
      logging.info(`Ignoring stage build for ${this.name}`);
      return;
    }
    try {
      await this.initBuild();
      await this.cloneComponent();
      const [commitPkg, commitLock] = await this.bumpVersion();
      await this.buildChangelog();
      await this.commitStage(commitPkg, commitLock);
      await this.pushStage();
      await this.commitMaster();
      await this.pushMaster();
      await this.cleanup();
      logging.info('Stage build complete.');
    } catch (e) {
      await this.cleanup();
      logging.error(`Stage build error: ${e.message}`);
      throw e;
    }
  }

  async cloneComponent() {
    await this.git.clone(false, 'stage');
  }

  async bumpVersion() {
    if (!this.bumpVersion) {
      return [false, false];
    }
    const bumper = new VersionBump(this.elementWorkingDir);
    return await bumper.bump('minor');
  }

  async buildChangelog() {
    logging.debug('Generaing changelog file...');
    const changelog = new Changelog(this.elementWorkingDir);
    return await changelog.build();
  }

  /**
   * Commits current changes to stage branch.
   *
   * @param {Boolean} commitPkg True to commit package.json file
   * @param {Boolean} commitLock True to commit package-lock.json file
   * @return {Promise}
   */
  async commitStage(commitPkg, commitLock) {
    logging.verbose('Commiting changes to stage...');
    const repo = this.git.repo;
    const files = ['CHANGELOG.md'];
    if (commitPkg) {
      files[files.length] = 'package.json';
    }
    if (commitLock) {
      files[files.length] = 'package-lock.json';
    }
    const oid = this.git.commitFiles(files);
    const head = await Git.Reference.nameToId(repo, 'HEAD');
    const parent = await repo.getCommit(head);
    const msg = '[ci skip] Automated commit after stage build.';
    /* this.stageOid = */
    await this.git.createCommit(repo, 'HEAD', msg, oid, [parent]);
    // this.stageHead = await repo.head();
    logging.verbose('Stage branch is ready.');
  }
  /**
   * Pushes changes to the stage to origin
   * @return {Promise}
   */
  async pushStage() {
    const repo = this.git.repo;
    return await this.git.push(repo, 'stage');
  }
  /**
   * Merges stage with master and commits changes.
   * @return {Promise}
   */
  async commitMaster() {
    logging.verbose('Merging stage with master...');
    const repo = this.git.repo;
    await this.git.checkoutOrCreate(repo, 'master');
    const ourCommit = await repo.getBranchCommit('master');
    const theirsCommit = await repo.getBranchCommit('stage');
    const index = Git.Merge.commits(repo, ourCommit, theirsCommit, { fileFavor: Git.Merge.FILE_FAVOR.THEIRS });
    if (index.hasConflicts()) {
      index.conflictCleanup();
    }
    const repoIndex = await repo.refreshIndex();
    await repoIndex.addAll();
    await repoIndex.write();
    const oid = await repoIndex.writeTree();
    const msg = '[ci skip] Automated merge stage->master. Releasing component.';
    const parents = [ourCommit, theirsCommit];
    logging.verbose('Creating commit message...');
    await this.git.createCommit(repo, 'refs/heads/master', msg, oid, parents);
    await this.git.mergeRemote(repo, 'master');
    logging.verbose('Master branch is merged and ready.');
  }
  /**
   * Pushes changes to the stage to origin
   * @return {Promise}
   */
  async pushMaster() {
    const repo = this.git.repo;
    return await this.git.push(repo, 'master');
  }
}
