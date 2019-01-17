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
    'OAUTH2_CLIENT_ID',
    'OAUTH2_CLIENT_SECRET',
    'OAUTH2_CALLBACK',
    'PORT',
    'SECRET',
    'SUBSCRIPTION_NAME',
    'INSTANCE_CONNECTION_NAME',
    'TOPIC_NAME',
    'CI_API_SECRET'
  ])
  // 3. Config file
  .file({file: path.join(__dirname, 'config.json')})
  // 4. Defaults
  .defaults({
    // Typically you will create a bucket with the same name as your project ID.
    // CLOUD_BUCKET: '',

    // This is the id of your project in the Google Cloud Developers Console.
    GCLOUD_PROJECT: '',

    // Connection url for the Memcache instance used to store session data
    MEMCACHE_URL: 'localhost:11211',

    OAUTH2_CLIENT_ID: '',
    OAUTH2_CLIENT_SECRET: '',
    OAUTH2_CALLBACK: 'http://localhost:8080/auth/callback',

    PORT: 8080,

    // Set this a secret string of your choosing
    SECRET: '',

    SUBSCRIPTION_NAME: 'apic-worker-subscription',
    TESTS_PROCESS_TOPIC_NAME: 'test-process-queue',

    // The secret passed to the interested teams to perform unauthenticated calls
    // as an authenticated user.
    CI_API_SECRET: ''
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
// checkConfig('CLOUD_BUCKET');
checkConfig('OAUTH2_CLIENT_ID');
checkConfig('OAUTH2_CLIENT_SECRET');
