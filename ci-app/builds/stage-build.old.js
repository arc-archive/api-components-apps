import logging from '../lib/logging';
import Git from 'nodegit';
import { Changelog } from './changelog';
import { GitBuild } from './git-build';
/**
 * A class responsible for processing "stage" branch after successfult stage build.
 */
export class StageBuild extends GitBuild {
  constructor(info) {
    super();
    this.info = info;
  }

  build() {
    return this.createWorkingDir()
      .then(() => this._clone())
      .then(() => this._buildChangelog())
      .then(() => this._commitStage())
      .then(() => this._push('stage'))
      .then(() => this._commitMaster())
      .then(() => this._push('master'))
      .then(() => this.cleanup())
      .then(() => {
        logging.info('Stage build completed.');
      })
      .catch((cause) => {
        this.cleanup();
        logging.error('Stage build error: ' + cause.message);
        throw cause;
      });
  }

  _buildChangelog() {
    logging.debug('Generaing changelog changelog...');
    const changelog = new Changelog(this.workingDir);
    return changelog.build();
  }

  _commitStage() {
    logging.verbose('Commiting changes to stage...');
    let index;
    let oid;
    return this.repo
      .index()
      .then((result) => {
        index = result;
        return index.addByPath('CHANGELOG.md');
      })
      .then(() => index.write())
      .then(() => index.writeTree())
      .then((result) => {
        oid = result;
        return Git.Reference.nameToId(this.repo, 'HEAD');
      })
      .then((head) => this.repo.getCommit(head))
      .then((parent) => {
        const msg = '[ci skip] Automated commit after stage build.';
        return this._createCommit('HEAD', msg, oid, [parent]);
      })
      .then(() => this.repo.head())
      .then((head) => {
        this.stageHead = head;
      })
      .then((commitOid) => {
        this.stageOid = commitOid;
        logging.verbose('Stage branch is ready to be pushed.');
      });
  }
  /**
   * Merges stage with master and commits changes.
   * @return {Promise}
   */
  _commitMaster() {
    logging.verbose('Merging stage with master...');
    let ourCommit;
    let theirsCommit;
    let repoIndex;
    return this.repo
      .checkoutBranch('master')
      .catch(() => this._createMaster())
      .then(() => this.repo.getBranchCommit('master'))
      .then((commit) => {
        ourCommit = commit;
        return this.repo.getBranchCommit('stage');
      })
      .then((commit) => {
        theirsCommit = commit;
        return Git.Merge.commits(this.repo, ourCommit, theirsCommit, { fileFavor: Git.Merge.FILE_FAVOR.THEIRS });
      })
      .then((index) => {
        if (index.hasConflicts()) {
          index.conflictCleanup();
        }
        return this.repo.refreshIndex();
      })
      .then((index) => {
        repoIndex = index;
        return index.addAll();
      })
      .then(() => repoIndex.write())
      .then(() => repoIndex.writeTree())
      .then((oid) => {
        const msg = '[ci skip] Automated merge stage->master. Releasing component.';
        const parents = [ourCommit, theirsCommit];
        logging.verbose('Creating comimt message...');
        return this._createCommit('refs/heads/master', msg, oid, parents);
      })
      .then(() => this._fetchAndMerge('master'))
      .then(() => {
        logging.verbose('Master branch is merged and ready to be pushed.');
      });
  }

  _createMaster() {
    logging.verbose('Creating master branch...');
    return this.repo
      .getHeadCommit()
      .then((targetCommit) => {
        return this.repo.createBranch('master', targetCommit, false);
      })
      .then((reference) => this.repo.checkoutBranch(reference, {}));
  }

  _fetchAndMerge(remote) {
    const origin = 'origin/' + remote;
    return this.repo.fetch('origin', this._getFetchOptions()).then(() => {
      const sig = this._createSignature();
      return this.repo.mergeBranches(remote, origin, sig, {}, { fileFavor: Git.Merge.FILE_FAVOR.OURS });
    });
  }
}
