'use strict';

class BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WinNextBaseError';
  }
}

module.exports = BaseError;
