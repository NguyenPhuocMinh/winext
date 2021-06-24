'use strict';

const BaseError = require('./base-error');

class NotFoundApplicationError extends BaseError {
  constructor(error) {
    super(error);
    this.name = 'NotFoundApplicationError';
    this.message = error.message;
    this.stack = error.stack;
  }
};

module.exports = NotFoundApplicationError;