'use strict';

const BaseError = require('./base-error');

class NotFoundModuleError extends BaseError {
  constructor(error) {
    super(error);
    this.name = 'NotFoundModuleError';
  }
};

module.exports = NotFoundModuleError;