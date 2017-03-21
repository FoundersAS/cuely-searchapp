var { app } = require('electron');
process.env.BABEL_CACHE_PATH = app.getPath('userData') + '/.babel-cache.json';

require('babel-core/register');
require('./env.js');

// OPBEAT
var opbeat = require('opbeat').start({
  appId: process.env.OPBEAT_APP_ID,
  organizationId: process.env.OPBEAT_ORG_ID,
  secretToken: process.env.OPBEAT_TOKEN
})

require('babel-polyfill');
require('./main.js');
