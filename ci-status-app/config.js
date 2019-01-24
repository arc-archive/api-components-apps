'use strict';
const nconf = (module.exports = require('nconf'));
const path = require('path');

nconf
  // 1. Command-line arguments
  .argv()
  // 2. Environment variables
  .env([
    // 'CLOUD_BUCKET',
    'GCLOUD_PROJECT',
    'NODE_ENV',
    'PORT'
  ])
  // 3. Config file
  .file({file: path.join(__dirname, 'config.json')})
  // 4. Defaults
  .defaults({
    GCLOUD_PROJECT: '',
    PORT: 8080
  });

function checkConfig(setting) {
  if (!nconf.get(setting)) {
    throw new Error(
      `You must set ${setting} as an environment variable or in config.json!`
    );
  }
}

// Check for required settings
checkConfig('GCLOUD_PROJECT');
checkConfig('PORT');
