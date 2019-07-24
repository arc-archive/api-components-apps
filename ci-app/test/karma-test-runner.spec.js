const { GitBuild } = require('../apic/builds/git-build.js');
// const { assert } = require('chai');
const path = require('path');
// const fs = require('fs-extra');

describe.only('Changelog class', () => {
  let tmp;
  let gbuild;
  const component = 'star-rating';
  before(async () => {
    gbuild = new GitBuild();
    tmp = await gbuild.createWorkingDir();
    await gbuild._clone({
      branch: 'master',
      sshUrl: `git@github.com:advanced-rest-client/${component}.git`,
      componentDir: path.join(tmp, component)
    });
  });

  after(async () => {
    await gbuild.cleanup();
  });
});
