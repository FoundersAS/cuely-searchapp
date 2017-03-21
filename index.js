var { app } = require('electron');
process.env.BABEL_CACHE_PATH = app.getPath('userData') + '/.babel-cache.json';

require('babel-core/register');

// OPBEAT
var opbeat = require('opbeat').start({
  appId: 'dfa235a44d',
  organizationId: '6fdeb7471e66415ca8f90f81093af2b5',
  secretToken: '7d0e3d206f858fbaeddb3ca0be74a7baf4280e9e',
})

require('babel-polyfill');
require('./env.js');
require('./main');
