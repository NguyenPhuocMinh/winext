'use strict';

const BaseError = require('./base-error');

class NotFoundApplicationError extends BaseError {
  constructor(error) {
    super(error);
    this.name = 'NotFoundApplicationError';
  }
};

module.exports = NotFoundApplicationError;