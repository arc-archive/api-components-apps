const { KarmaTestRunner } = require('../apic/test-runners/karma-test-runner.js');
/* eslint-disable no-console */
const testConfig = {
  component: 'arc-icons',
  branch: 'master',
  type: 'bottom-up',
  includeDev: false
};

const runner = new KarmaTestRunner('advanced-rest-client', testConfig.component, testConfig);
runner.run()
.then((result) => console.log(result))
.catch((cause) => console.log(cause));
