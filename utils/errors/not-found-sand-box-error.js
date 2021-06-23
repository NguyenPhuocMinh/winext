'use strict';

const BaseError = require('./base-error');

class NotFoundSandboxError extends BaseError {
  constructor(error) {
    super(error);
    this.name = 'NotFoundSandboxError';
  }
};

module.exports = NotFoundSandboxError;