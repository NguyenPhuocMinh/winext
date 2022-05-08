'use strict';

const buffer = require('buffer').Buffer;
const uuid = require('uuid');
const errors = require('./errors');

function _loadModule(moduleName) {
  try {
    return require(moduleName);
  } catch (error) {
    console.error('LoadModule Error', error);
    throw new errors.NotFoundModuleError(error);
  }
}

const ATTRIBUTE_NAME = 'requestID';

const _generateRequestID = (_request) => {
  return uuid.v4(null, buffer.alloc(16)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 22);
};

/**
 * For apply middleware
 * @param {Function} generator
 * @param {String} headerName
 * @param {Boolean} setHeader
 * @see winext-runserver
 */
function _loadRequestId({ generator = _generateRequestID, headerName = 'X-Request-Id', setHeader = true }) {
  return function (request, response, next) {
    const oldRequestID = request.get(headerName);
    const requestID = oldRequestID === undefined ? generator(request) : oldRequestID;

    if (setHeader) {
      response.set(headerName, requestID);
    }

    request[ATTRIBUTE_NAME] = requestID;

    next();
  };
}

module.exports = {
  loadModule: _loadModule,
  loadRequestId: _loadRequestId,
  generateRequestID: _generateRequestID
};
