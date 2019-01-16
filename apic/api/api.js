'use strict';
const express = require('express');
const router = express.Router();
const logging = require('../../lib/logging');

// Test scheduling route
router.use('/tests', require('./tests-api'));
// User route
router.use('/me', require('./me-api'));
// JWT info route
router.use('/tokeninfo', require('./token-api'));

// Errors
router.use((req, res) => {
  const message = `Route ${req.url} not found`;
  logging.warn(message);
  res.status(404).send({
    error: true,
    message
  });
});

router.use((err, req, res) => {
  logging.error(err);
  res.send({
    error: true,
    message: 'There was an error. That is all we can share.'
  });
});

module.exports = router;
