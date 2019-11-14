/* eslint-disable no-console */

// import { KarmaTestRunner } from '../test-runners/karma-test-runner.js';
// const testConfig = {
//   component: '@advanced-rest-client/arc-icons',
//   org: 'advanced-rest-client',
//   branch: 'master',
//   type: 'bottom-up',
//   includeDev: false
// };
//
// const runner = new KarmaTestRunner(
//   'advanced-rest-client',
//   'arc-icons',
//   '@advanced-rest-client/arc-icons',
//   testConfig
// );
// runner.run()
// .then((result) => console.log(result))
// .catch((cause) => console.log(cause));

// import { AmfBuilder } from '../test-runners/amf-builder.js';
// import tmp from 'tmp';
// import fs from 'fs-extra';
//
// (async () => {
//   const tmpobj = tmp.dirSync();
//   const workingDir = tmpobj.name;
//   const build = new AmfBuilder(workingDir, {
//     branch: 'release/4.0.1'
//   });
//   try {
//     await build.run();
//     console.log('Build complete');
//     const list = await fs.readdir(workingDir + '/lib');
//     console.log(list);
//   } catch (e) {
//     console.error(e);
//   }
// })();

// import { GitSourceControl } from '../github/git-source-control.js';
import { Changelog } from '../builds/changelog.js';
import path from 'path';
// import fs from 'fs-extra';

(async () => {
  const workingDir = '/tmp/apic-ci-tests';
  // await fs.ensureDir(workingDir);
  const org = 'advanced-rest-client';
  const name = 'auth-methods';
  const elementDir = path.join(workingDir, name);
  // const github = new GitSourceControl(workingDir, org, name);
  // await github.clone(false);
  // console.log(elementDir);
  const changelog = new Changelog(elementDir, org, name);
  const value = await changelog.get();
  console.log(value);
})();
