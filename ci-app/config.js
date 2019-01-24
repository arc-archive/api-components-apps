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
    'INSTANCE_CONNECTION_NAME',
    'MEMCACHE_URL',
    'GPG_KEY',
    'CI_EMAIL',
    'CI_NAME',
    'GPG_KEY_PASS',
    'GITHUB_SSH_KEY',
    'GITHUB_SSH_KEY_PUB',
    'GITHUB_SSH_KEY_PASS',
    'WEBHOOK_SECRET'
  ])
  // 3. Config file
  .file({file: path.join(__dirname, 'config.json')})
  // 4. Defaults
  .defaults({
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
    // GPG key configuration to sign commits in GitHub CI pipeline.
    // This information is encoded as Secret.
    GPG_KEY: '', // GPG key location
    CI_EMAIL: '', // GPG key's email
    CI_NAME: '', // GPG user name
    GPG_KEY_PASS: '', // Key password

    // SSH key to connect to GitHub
    GITHUB_SSH_KEY: '', // location of the key
    GITHUB_SSH_KEY_PUB: '', // location of the public key
    GITHUB_SSH_KEY_PASS: '', // Key's password

    // GitHub webhook secret
    WEBHOOK_SECRET: ''
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

// API config check
if (!nconf.get('SCRIPT') || nconf.get('SCRIPT') === 'api.js') {
  checkConfig('MEMCACHE_URL');
  checkConfig('OAUTH2_CLIENT_ID');
  checkConfig('OAUTH2_CLIENT_SECRET');
  checkConfig('SECRET');
}

// Github pod config check
if (nconf.get('SCRIPT') === 'github.js') {
  checkConfig('GPG_KEY');
  checkConfig('CI_EMAIL');
  checkConfig('CI_NAME');
  checkConfig('GPG_KEY_PASS');
  checkConfig('GITHUB_SSH_KEY');
  checkConfig('GITHUB_SSH_KEY_PUB');
  checkConfig('GITHUB_SSH_KEY_PASS');
  checkConfig('WEBHOOK_SECRET');
}
// CI worker config check
if (nconf.get('SCRIPT') === 'worker.js') {
  checkConfig('GPG_KEY');
  checkConfig('CI_EMAIL');
  checkConfig('CI_NAME');
  checkConfig('GPG_KEY_PASS');
  checkConfig('GITHUB_SSH_KEY');
  checkConfig('GITHUB_SSH_KEY_PUB');
  checkConfig('GITHUB_SSH_KEY_PASS');
}
