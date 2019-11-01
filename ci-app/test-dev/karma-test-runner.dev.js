import { KarmaTestRunner } from '../test-runners/karma-test-runner.js';
/* eslint-disable no-console */
const testConfig = {
  component: '@advanced-rest-client/arc-icons',
  org: 'advanced-rest-client',
  branch: 'master',
  type: 'bottom-up',
  includeDev: false
};

const runner = new KarmaTestRunner(
  'advanced-rest-client',
  'arc-icons',
  '@advanced-rest-client/arc-icons',
  testConfig
);
runner.run()
.then((result) => console.log(result))
.catch((cause) => console.log(cause));
