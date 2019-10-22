const { spawn } = require('child_process');
const path = require('path');
/* eslint-disable no-console */
function prepareAmfBuild(workingDir, branch, sha) {
  return new Promise((resolve, reject) => {
    const amf = spawn(path.join(__dirname, 'amf-compiler.sh'), [workingDir, branch, sha]);

    amf.stdout.on('data', (data) => {
      console.info(`[AMF BUILD]: ${data}`);
    });

    amf.stderr.on('data', (data) => {
      console.error(`[AMF BUILD] ERR: ${data}`);
    });

    amf.on('close', (code) => {
      console.info(`[AMF BUILD] exit code is ${code}`);
      if (code !== 0) {
        reject(new Error('AMF build exit with code ' + code));
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  prepareAmfBuild
};
