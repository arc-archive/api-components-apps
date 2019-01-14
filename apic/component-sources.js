const {spawn} = require('child_process');
const path = require('path');
const logging = require('../lib/logging');

function prepareComponent(workingDir, componentName) {
  console.log('Preparing component sources', componentName);
  return new Promise((resolve, reject) => {
    const amf = spawn(path.join(__dirname, 'update-git-element.sh'), [workingDir, componentName]);

    amf.stdout.on('data', (data) => {
      logging.verbose(`[CMP BUILD]: ${data}`);
    });

    amf.stderr.on('error', (data) => {
      logging.error(`[CMP BUILD] ERR: ${data}`);
    });

    amf.on('close', (code) => {
      logging.info(`[CMP BUILD] exit code is ${code}`);
      if (code !== 0) {
        reject(new Error('Component preparation exit with code ' + code));
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  prepareComponent: prepareComponent
};
