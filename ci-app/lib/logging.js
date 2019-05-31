'use strict';

const winston = require('winston');
const expressWinston = require('express-winston');
const StackdriverTransport = require('@google-cloud/logging-winston').LoggingWinston;

const colorize = process.env.NODE_ENV !== 'production';

// Logger to capture all requests and output them to the console.
const requestLogger = expressWinston.logger({
  level: 'warn',
  transports: [
    new StackdriverTransport(),
    new winston.transports.Console({
      json: false,
      colorize: colorize,
    })
  ],
  expressFormat: true,
  meta: false
});

// Logger to capture any top-level errors and output json diagnostic info.
const errorLogger = expressWinston.errorLogger({
  level: 'warn',
  transports: [
    new StackdriverTransport(),
    new winston.transports.Console({
      json: true,
      colorize: colorize,
    })
  ]
});

const logger = winston.createLogger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      json: false,
      colorize: colorize
    })
  ]
});

module.exports = {
  requestLogger: requestLogger,
  errorLogger: errorLogger,
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  log: logger.log.bind(logger),
  verbose: logger.verbose.bind(logger),
  debug: logger.debug.bind(logger),
  silly: logger.silly.bind(logger),
};
