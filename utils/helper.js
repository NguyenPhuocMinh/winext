'use strict';

const buffer = require('buffer').Buffer;
const uuid = require('uuid');
const slugify = require('slugify');
const errors = require('./errors');

const ATTRIBUTE_KEY = 'requestID';

function _loadModule(moduleName) {
  try {
    return require(moduleName);
  } catch (error) {
    console.error('LoadModule Error', error);
    throw new errors.NotFoundModuleError(error);
  }
}

const _generateRequestID = (_request) => {
  return uuid.v4(null, buffer.alloc(16)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 22);
};

/**
 * For apply middleware
 * @see winext-runserver
 */
function _loadRequestId(request, response, next) {
  const generator = _generateRequestID;
  const headerName = 'X-Request-Id';

  const oldRequestID = request.get(headerName);
  const requestID = oldRequestID === undefined ? generator(request) : oldRequestID;

  response.set(headerName, requestID);
  request[ATTRIBUTE_KEY] = requestID;

  return next();
}

/**
 * Parse slugify
 * @param {String} data
 * @param {Object} options
 * @see https://www.npmjs.com/package/slugify
 */
function _parseSlug(data = '', options = { lower: true }) {
  return slugify(data, options);
}

module.exports = {
  loadModule: _loadModule,
  loadRequestId: _loadRequestId,
  generateRequestID: _generateRequestID,
  parseSlug: _parseSlug
};
