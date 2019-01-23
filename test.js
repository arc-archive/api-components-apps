const {fork} = require('child_process');
const options = {
  execArgv: []
};
try {
  const amfProc = fork('./apic/amf-parser.js', ['--working-dir', '/tmp/123'], options);
  amfProc.on('message', (result) => {
    console.log(result);
  });

  amfProc.on('error', (error) => {
    console.log('PROC ERROR', error);
  });
} catch (e) {
  console.error('CATCH', e);
}
