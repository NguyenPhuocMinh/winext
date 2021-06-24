'use strict';

const Promise = require('bluebird');
const lodash = require('lodash');
const errors = require('../utils/errors');
const { loadModule, requestId } = require('../utils/helper');
const { get, isEmpty, forOwn } = lodash;

const winnext = {};

function initializer(sandbox = {}, dependencies = [], models = {}) {
  const { application } = sandbox;

  let errorManagers = null;

  if (!isEmpty(dependencies)) {
    if (dependencies.includes('winext-error-manager')) {
      errorManagers = loadModule('winext-error-manager');
    }
  } else {
    throw new Error('RequiredModule');
  }

  console.log("AAAA", errorManagers);

  let modelMongo = [];
  let modelSQL = [];

  try {
    if (!isEmpty(sandbox)) {
      if (!isEmpty(application)) {
        const plugins = get(application, 'dependencies', {});
        if (!isEmpty(plugins) && !isEmpty(dependencies)) {
          forOwn(plugins, ((value, key) => {
            let plugin = '';
            if (key.includes('_')) {
              plugin = key.replace('_', '-');
            }
            if (!dependencies.includes(plugin)) {
              throw new Error('PluginNotFoundInApplication');
            }
          }))
        } else {
          throw new Error('PluginNotFoundInApplication');
        }
      } else {
        throw new Error('ApplicationNotFound');
      }
    } else {
      throw new Error('SandboxNotFound');
    }
    if (!isEmpty(models)) {
      modelMongo = loadModule(models.mongo);
      modelSQL = loadModule(models.sql);
    }
  } catch (error) {
    console.log("🚀 ~ file: win.js ~ line 56 ~ initializer ~ error", error)
    switch (error) {
      case error.message === 'SandboxNotFound':
        throw new errors.NotFoundSandboxError();
      case error.message === 'ApplicationNotFound':
        throw new errors.NotFoundApplicationError();
      case error.message === 'PluginNotFoundInApplication':
        throw new errors.NotFoundDependencyError();
      case error.code === 'NotFoundModuleError':
        throw new errors.NotFoundModuleError(error);
      case error.message === 'RequiredModule':
        throw new errors.RequiredModuleError(error, 'winext-error-manager');
      default:
        return Promise.reject(error);
    }
  }

  return building({ sandbox, dependencies, modelMongo, modelSQL });
};

function building(params = {}) {

  try {

    const __app__ = {};

    const sandboxConfig = get(params, 'sandbox', {});
    const dependencyPlugins = get(params, 'dependencies', []);
    const modelDescriptorMongo = get(params, 'modelMongo', []);
    const modelDescriptorSQL = get(params, 'modelSQL', [])

    /**
     * config
     */
    const dependencyConfig = get(sandboxConfig, 'application.dependencies');
    const loggerConfig = get(dependencyConfig, 'winext_logger');
    const serverConfig = get(dependencyConfig, 'winext_runserver');
    const repositoryConfig = get(dependencyConfig, 'winext_repository');
    const authorizationConfig = get(dependencyConfig, 'winext_authorization');

    const routerMappingsConfig = get(sandboxConfig, 'application.routerMappings');
    const errorCodesConfig = get(sandboxConfig, 'application.errorCodes');



    /**
     * logger
     */
    if (dependencyPlugins.includes('winext-logger')) {

      const winext_logger = loadModule('winext-logger');

      if (!isEmpty(winext_logger)) {

        const loggerParams = {
          config: loggerConfig,
        };

        winext_logger.register(loggerParams);

        __app__.logger = winext_logger;
      }
    }

    /**
     *  repository
     */
    if (dependencyPlugins.includes('winext-repository')) {
      const winext_repository = loadModule('winext-repository');
      if (!isEmpty(winext_repository)) {

        const repoParams = {
          config: repositoryConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_repository'),
        };

        const dataStoreTriggerParams = {
          modelDescriptor: modelDescriptorMongo,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_store_trigger'),
        };

        const dataSequelizeTriggerParams = {
          config: repositoryConfig,
          modelDescriptor: modelDescriptorSQL,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_sequelize_trigger'),
        };

        winext_repository.register(repoParams);
        winext_repository.dataStore.register(dataStoreTriggerParams);
        winext_repository.dataSequelize.register(dataSequelizeTriggerParams);

        __app__.repository = {
          startMongoose: () => winext_repository.startupMongoose(),
          closeMongoose: () => winext_repository.shutdownMongoose(),
          startMySql: () => winext_repository.startupMySql(),
          closeMySql: () => winext_repository.shutdownMySql(),
          dataStore: winext_repository.dataStore,
          dataSequelize: winext_repository.dataSequelize,
        };
      }
    }

    /**
     * authentication
     */
    if (dependencyPlugins.includes('winext-authorization')) {
      const winext_authorization = loadModule('winext-authorization');

      if (!isEmpty(winext_authorization)) {

        const authorizationParams = {
          config: authorizationConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_authorization')
        }

        winext_authorization.register(authorizationParams);

        __app__.authorization = winext_authorization;
      }
    }

    /**
     * run server
     */
    if (dependencyPlugins.includes('winext-runserver')) {
      const winext_runserver = loadModule('winext-runserver');

      if (!isEmpty(winext_runserver)) {

        const serverParams = {
          config: serverConfig,
          requestId: requestId,
          repository: __app__.repository,
          loggerFactory: __app__.logger.getLogger('winext_runserver'),
        };

        const mappingTriggerParams = {
          config: serverConfig,
          mappings: routerMappingsConfig,
          requestId: requestId,
          repository: __app__.repository,
          authorization: __app__.authorization,
          loggerFactory: __app__.logger.getLogger('mapping_trigger')
        };

        const errorManagerParams = {
          errorCodes: errorCodesConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('error_manager')
        };

        winext_runserver.register(serverParams);
        winext_runserver.mappingTrigger.register(mappingTriggerParams);
        winext_runserver.errorManager.register(errorManagerParams);

        __app__.server = {
          start: () => winext_runserver.startup(),
          close: () => winext_runserver.shutdown(),
        };
      }
    }

    return __app__;

  } catch (err) {
    return Promise.reject(err);
  }
};

winnext.initializer = initializer;
winnext.require = loadModule;

exports = module.exports = winnext;