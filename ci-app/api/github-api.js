import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import config from '../config';
import { BaseApi } from './base-api';
import logging from '../lib/logging';
import { ComponentBuildModel } from '../models/component-build-model';

const router = express.Router();
export default router;
router.use(bodyParser.json());

class GithubApiRoute extends BaseApi {
  constructor() {
    super();
    this.model = new ComponentBuildModel();
  }

  ack(res) {
    res.set('Connection', 'close');
    res.sendStatus(201);
  }

  processStatus(req, res) {
    try {
      this.verifySignature(req);
    } catch (e) {
      this.sendError(res, e.message, 400);
      return;
    }
    if (this.isPing(req)) {
      res.sendStatus(204);
      return;
    }
    const body = req.body;
    if (this.isStageSuccess(body)) {
      this.ack(res);
      this.scheduleStageBuild(body);
      return;
    }

    if (this.isMasterPush(req.headers, body)) {
      this.ack(res);
      this.scheduleMasterBuild(body);
      return;
    }

    if (this.isTagPush(req.headers, body)) {
      this.ack(res);
      this.scheduleTagBuild(body);
      return;
    }

    res.sendStatus(204);
  }

  isPing(req) {
    if (req.get('X-GitHub-Event') === 'ping') {
      return true;
    }
  }

  isStageSuccess(body) {
    if (body.context !== 'continuous-integration/travis-ci/push') {
      return false;
    }

    if (body.state !== 'success') {
      return false;
    }

    return this.hasBranch(body, 'stage');
  }

  hasBranch(body, name) {
    const branches = body.branches;
    if (!branches) {
      return false;
    }
    const branch = branches[branches.length - 1];
    if (!branch || branch.name !== name) {
      return false;
    }
    return true;
  }
  /**
   * Checks if the head commit contains `[bump-version]` phrase.
   * @param {Object} body GH payload body
   * @return {Boolean} True if the phrase exists in head commit message.
   */
  isAutoBump(body) {
    const { commit } = body;
    if (!commit) {
      return false;
    }
    const c = commit.commit;
    if (!c) {
      return false;
    }
    const { message } = c;
    if (typeof message !== 'string') {
      return false;
    }
    return message.indexOf('[bump-version]') !== -1;
  }

  scheduleStageBuild(body) {
    const branches = body.branches;
    let branch;
    for (let i = 0; i < branches.length; i++) {
      if (branches[i].name === 'stage') {
        branch = branches[i];
        break;
      }
    }
    const sshUrl = body.repository.ssh_url;
    const name = body.repository.full_name;
    const org = body.organization.login;
    const sha = branch.commit.sha;
    const bumpVersion = this.isAutoBump(body);
    this.model.insertBuild({
      type: 'stage-build',
      branch: 'stage',
      component: name,
      org,
      commit: sha,
      sshUrl,
      bumpVersion
    });
  }

  scheduleMasterBuild(body) {
    const sshUrl = body.repository.ssh_url;
    const name = body.repository.full_name;
    const org = body.organization.login;
    const sha = body.head_commit.id;
    this.model.insertBuild({
      type: 'master-build',
      branch: 'master',
      component: name,
      org,
      commit: sha,
      sshUrl: sshUrl
    });
  }

  scheduleTagBuild(body) {
    const sshUrl = body.repository.ssh_url;
    const name = body.repository.full_name;
    const org = body.organization.login;
    const sha = body.head_commit.id;
    this.model.insertBuild({
      type: 'tag-build',
      branch: body.ref.replace('refs/tags/', ''),
      component: name,
      org,
      commit: sha,
      sshUrl: sshUrl
    });
  }

  isMasterPush(headers, body) {
    if (headers['x-github-event'] !== 'push') {
      return false;
    }
    return body.ref === 'refs/heads/master';
  }

  isTagPush(headers, body) {
    if (headers['x-github-event'] !== 'push') {
      return false;
    }
    const ref = body.ref;
    return !!(ref && ref.indexOf('refs/tags/') === 0);
  }

  verifySignature(req) {
    const payload = JSON.stringify(req.body);
    if (!payload) {
      throw new Error('Request body empty');
    }

    const hmac = crypto.createHmac('sha1', config.get('WEBHOOK_SECRET'));
    const digest = 'sha1=' + hmac.update(payload).digest('hex');
    const checksum = req.headers['x-hub-signature'];
    if (!checksum || !digest || checksum !== digest) {
      logging.warn(`Request body digest (${digest}) did not match x-hub-signature (${checksum})`);
      throw new Error('Signature is invalid');
    }
  }
  /**
   * Schedules stage build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `6b4855889c6d30cf203beddb6cf8eb42b5257609`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Object} req
   * @param {Object} res
   * @return {Promise}
   */
  async queueStageManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401
        };
        throw o;
      }
      const { body } = req;
      const { commit='', sshUrl, component, org } = body;
      await this.model.insertBuild({
        type: 'stage-build',
        branch: 'stage',
        component,
        org,
        commit,
        sshUrl,
      });
      this.ack(res);
    } catch (e) {
      logging.error(e);
      // eslint-disable-next-line no-console
      console.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }
  /**
   * Schedules master build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `220ab4f78bfd180fc7a2ad3358735d76c5fb9487`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Object} req
   * @param {Object} res
   * @return {Promise}
   */
  async queueMasterManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401
        };
        throw o;
      }
      this.ack(res);
      const { body } = req;
      const { commit='', sshUrl, component, org } = body;
      this.model.insertBuild({
        type: 'master-build',
        branch: 'master',
        component,
        org,
        commit,
        sshUrl
      });
    } catch (e) {
      logging.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }
  /**
   * Schedules tag build for a component manually.
   * The body must contain:
   * - `sshUrl`, e.g. `git@github.com:advanced-rest-client/star-rating.git`
   * - `component`, e.g. `advanced-rest-client/star-rating`
   * - `commit`, e.g. `220ab4f78bfd180fc7a2ad3358735d76c5fb9487`
   * - `branch`, e.g. `1.0.1`
   *
   * This endpoint requires admin access or token with `schedule-component-build`
   * scope.
   *
   * @param {Object} req
   * @param {Object} res
   * @return {Promise}
   */
  async queueTagManual(req, res) {
    try {
      const hasAccess = await this.isValidAccess(req, 'schedule-component-build');
      if (!hasAccess) {
        const o = {
          message: 'Unauthorized',
          status: 401
        };
        throw o;
      }
      this.ack(res);
      const { body } = req;
      const { commit, sshUrl, component, org, branch } = body;
      this.model.insertBuild({
        type: 'tag-build',
        branch: branch || 'master',
        component,
        org,
        commit,
        sshUrl
      });
    } catch (e) {
      logging.error(e);
      const status = e.status || 500;
      this.sendError(res, e.message, status);
    }
  }
}

const api = new GithubApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/status', cors(checkCorsFn), api.processStatus.bind(api));
router.post('/manual/stage', cors(checkCorsFn), api.queueStageManual.bind(api));
router.post('/manual/master', cors(checkCorsFn), api.queueMasterManual.bind(api));
router.post('/manual/tag', cors(checkCorsFn), api.queueTagManual.bind(api));
