'use strict';

class BaseError extends Error {
  constructor(error) {
    super(error);
    this.name = 'WinNextBaseError';
  }
}

module.exports = BaseError;
