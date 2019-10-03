const { KarmaTestRunner } = require('../apic/test-runners/karma-test-runner.js');
const testConfig = {
  component: 'events-target-mixin',
  branch: 'master',
  type: 'bottom-up',
  includeDev: false
};

const runner = new KarmaTestRunner('advanced-rest-client', 'file-drop', testConfig);
runner.run()
.then(() => console.log('Finished'))
.catch((cause) => console.log(cause));
