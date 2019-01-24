const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const config = require('../../config');
const {BaseApi} = require('./base-api');
const logging = require('../../lib/logging');
const {ComponentBuildModel} = require('../models/component-build-model');

const router = express.Router();
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
    const sha = branch.commit.sha;
    this.model.insertBuild({
      type: 'stage-build',
      branch: 'stage',
      component: name,
      commit: sha,
      sshUrl: sshUrl
    });
  }

  scheduleMasterBuild(body) {
    const sshUrl = body.repository.ssh_url;
    const name = body.repository.full_name;
    const sha = body.head_commit.id;
    this.model.insertBuild({
      type: 'master-build',
      branch: 'master',
      component: name,
      commit: sha,
      sshUrl: sshUrl
    });
  }

  scheduleTagBuild(body) {
    const sshUrl = body.repository.ssh_url;
    const name = body.repository.full_name;
    const sha = body.head_commit.id;
    this.model.insertBuild({
      type: 'tag-build',
      branch: body.ref.replace('refs/tags/', ''),
      component: name,
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
}

const api = new GithubApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/status', cors(checkCorsFn), api.processStatus.bind(api));

module.exports = router;
