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
const config = require('./config');
const logging = require('./lib/logging');
const app = express();

app.disable('etag');
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(logging.requestLogger);

app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});

if (config.get('NODE_ENV') === 'production') {
  app.use('/', express.static(path.join(__dirname, 'views', 'build', 'es6-bundled')));
} else {
  const proxy = require('express-http-proxy');
  app.use('/', proxy('http://127.0.0.1:8081'));
}

// Add the error logger after all middleware and routes so that
// it can log errors from the whole application. Any custom error
// handlers should go after this.
app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res) => {
  /* jshint unused:false */
  logging.error(err.response);
  res.status(500).send(err.response || 'Something is very wrong... :(');
});

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
