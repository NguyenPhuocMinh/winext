'use strict';

const buffer = require('buffer').Buffer;
const uuid = require('uuid');
const errors = require('./errors');

function _loadModule(moduleName) {
  try {
    return require(moduleName);
  } catch (error) {
    throw new errors.NotFoundModuleError(error);
  }
}

const _requestId = uuid.v4(null, buffer.alloc(16))
  .toString('base64')
  .replace(/\//g, '_')
  .replace(/\+/g, '-')
  .substring(0, 22);

module.exports = {
  loadModule: _loadModule,
  requestId: _requestId
};
