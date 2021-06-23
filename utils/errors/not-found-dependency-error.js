'use strict';

const BaseError = require('./base-error');

class NotFoundDependencyError extends BaseError {
  constructor(error) {
    super(error);
    this.name = 'NotFoundDependencyError';
  }
};

module.exports = NotFoundDependencyError;