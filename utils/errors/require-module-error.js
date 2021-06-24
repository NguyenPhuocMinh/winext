'use strict';

const BaseError = require('./base-error');

class RequiredError extends BaseError {
  constructor(error, module) {
    super(error, module);
    this.name = 'RequiredModuleError';
    this.message = `Please install ${module} in your package`;
  }
};

module.exports = RequiredError;