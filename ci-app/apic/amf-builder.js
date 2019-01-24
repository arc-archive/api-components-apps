const {spawn} = require('child_process');
const path = require('path');
const logging = require('../lib/logging');

function prepareAmfBuild(workingDir, branch, sha) {
  return new Promise((resolve, reject) => {
    const amf = spawn(path.join(__dirname, 'amf-compiler.sh'), [workingDir, branch, sha]);

    amf.stdout.on('data', (data) => {
      console.log(`[AMF BUILD]: ${data}`);
    });

    amf.stderr.on('data', (data) => {
      logging.error(`[AMF BUILD] ERR: ${data}`);
    });

    amf.on('close', (code) => {
      logging.info(`[AMF BUILD] exit code is ${code}`);
      if (code !== 0) {
        reject(new Error('AMF build exit with code ' + code));
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  prepareAmfBuild: prepareAmfBuild
};
