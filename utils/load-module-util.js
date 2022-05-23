'use strict';

const errors = require('./errors');

const loadModuleUtils = {};

function lookupModule(moduleName) {
  try {
    return require(moduleName);
  } catch (error) {
    console.error('LoadModule Error', error);
    throw new errors.NotFoundModuleError(error);
  }
}

loadModuleUtils.lookupModule = lookupModule;

module.exports = loadModuleUtils;
