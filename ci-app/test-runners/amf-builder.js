const { spawn } = require('child_process');
const path = require('path');
/* eslint-disable no-console */
function prepareAmfBuild(workingDir, branch, sha) {
  if (branch === 'master') {
    branch = 'HEAD';
  }
  return new Promise((resolve, reject) => {
    const amf = spawn(path.join(__dirname, 'amf-compiler.sh'), [workingDir, branch, sha]);
    let lastError;

    amf.stdout.on('data', (data) => {
      // console.info(`[AMF BUILD]: ${data}`);
    });

    amf.stderr.on('data', (data) => {
      console.error(`[AMF BUILD] ERR: ${data}`);
      const trimmed = data.trim ? data.trim() : data;
      if (trimmed) {
        lastError = trimmed;
      }
    });

    amf.on('close', (code) => {
      console.info(`[AMF BUILD] exit code is ${code}`);
      if (code !== 0) {
        if (lastError) {
          lastError = new Error(lastError);
        } else {
          lastError = new Error('AMF build exit with code ' + code);
        }
        reject(lastError);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  prepareAmfBuild
};
