// Copyright 2019, Mulesoft.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}

const path = require('path');
const express = require('express');
const session = require('express-session');
const MemcachedStore = require('connect-memcached')(session);
const passport = require('passport');
const config = require('./config');
const logging = require('./lib/logging');
const fs = require('fs-extra');

const app = express();

app.disable('etag');
app.set('trust proxy', true);
app.use(logging.requestLogger);

const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: config.get('SECRET'),
  signed: true,
};

if (config.get('NODE_ENV') === 'production' && config.get('MEMCACHE_URL')) {
  sessionConfig.store = new MemcachedStore({
    hosts: [config.get('MEMCACHE_URL')],
  });
}

app.use(session(sessionConfig));

// OAuth2
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./lib/oauth2').router);

app.use('/api', require('./apic/api/api'));

// API console
app.get('/api-docs*', (req, res) => {
  let url = req.url.replace('/api-docs', '');
  if (url[0] === '/') {
    url = url.substr(1);
  }
  if (url.indexOf('#') !== -1) {
    url = url.substr(0, url.indexOf('#'));
  }
  if (!url) {
    url = 'index.html';
  }
  const file = path.join('api-docs', url);
  fs.pathExists(file)
  .then((exists) => {
    if (!exists) {
      throw new Error('Not found');
    }
    return fs.readFile(file, 'utf8');
  })
  .then((content) => {
    res.type(path.extname(file));
    res.status(200).send(content);
  })
  .catch((cause) => {
    res.status(404).send(cause.message);
  });
});

app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});

app.use('/status', express.static(path.join(__dirname, 'views', 'build', 'esm-bundled')));

// Redirect root to /status
app.get('/', (req, res) => {
  res.redirect('/status');
});

// Add the error logger after all middleware and routes so that
// it can log errors from the whole application. Any custom error
// handlers should go after this.
app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Render default page
app.use((req, res) => {
  const file = path.join(__dirname, 'public', 'build', 'esm-bundled', 'index.html');
  res.sendFile(file);
});

// Basic error handler
app.use((err, req, res) => {
  /* jshint unused:false */
  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.
  logging.error(err.response);
  res.status(500).send(err.response || 'Something broke!');
});

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
