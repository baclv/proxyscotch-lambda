const serverless = require('serverless-http');
const proxy = require('./proxy');

exports.handler = serverless(proxy);
