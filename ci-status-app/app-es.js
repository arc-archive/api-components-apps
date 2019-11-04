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
import * as traceAgent from '@google-cloud/trace-agent';
import * as debugAgent from '@google-cloud/debug-agent';
import path from 'path';
import express from 'express';
import fs from 'fs';
import compression from 'compression';
import config from './config.js';
import logging from './lib/logging.js';

const IS_PRODUCTION = config.get('NODE_ENV') === 'production';

if (IS_PRODUCTION) {
  traceAgent.start();
  debugAgent.start();
}

const app = express();
export default app;

app.disable('etag');
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(logging.requestLogger);
app.use(compression());
app.use(express.static('dist'));

app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('*', (req, res) => {
  const index = path.join('dist', 'index.html');
  fs.readFile(index, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send({
        error: 'Unable to read index file',
      });
    } else {
      res.set('Content-Type', 'text/html');
      res.send(data);
    }
  });
});

const server = app.listen(config.get('PORT'), () => {
  const { port } = server.address();
  /* eslint-disable-next-line no-console */
  console.log(`App listening on port ${port}`);
});
