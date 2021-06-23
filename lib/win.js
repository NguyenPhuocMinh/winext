'use strict';

const Promise = require('bluebird');
const lodash = require('lodash');
const errors = require('../utils/errors');
const { loadModule, requestId } = require('../utils/helper');
const { get, isEmpty, forOwn } = lodash;

const winnext = {};

function initializer(sandbox = {}, dependencies = [], models = {}) {
  const { application } = sandbox;

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
    switch (error) {
      case error.message === 'SandboxNotFound':
        throw new errors.NotFoundSandboxError();
      case error.message === 'ApplicationNotFound':
        throw new errors.NotFoundApplicationError();
      case error.message === 'PluginNotFoundInApplication':
        throw new errors.NotFoundDependencyError();
      case error.code === 'NotFoundModuleError':
        throw new errors.NotFoundModuleError(error);
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
    const loggerConfig = get(dependencyConfig, 'app_logger');
    const serverConfig = get(dependencyConfig, 'app_runserver');
    const repositoryConfig = get(dependencyConfig, 'app_repository');
    const authorizationConfig = get(dependencyConfig, 'app_authorization');

    const routerMappingsConfig = get(sandboxConfig, 'application.routerMappings');
    const errorCodesConfig = get(sandboxConfig, 'application.errorCodes');



    /**
     * logger
     */
    if (dependencyPlugins.includes('winext-logger')) {

      const app_logger = loadModule('winext-logger');

      if (!isEmpty(app_logger)) {

        const loggerParams = {
          config: loggerConfig,
        };

        app_logger.register(loggerParams);

        __app__.logger = app_logger;
      }
    }

    /**
     *  repository
     */
    if (dependencyPlugins.includes('winext-repository')) {
      const app_repository = loadModule('winext-repository');
      if (!isEmpty(app_repository)) {

        const repoParams = {
          config: repositoryConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('app_repository'),
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

        app_repository.register(repoParams);
        app_repository.dataStore.register(dataStoreTriggerParams);
        app_repository.dataSequelize.register(dataSequelizeTriggerParams);

        __app__.repository = {
          startMongoose: () => app_repository.startupMongoose(),
          closeMongoose: () => app_repository.shutdownMongoose(),
          startMySql: () => app_repository.startupMySql(),
          closeMySql: () => app_repository.shutdownMySql(),
          dataStore: app_repository.dataStore,
          dataSequelize: app_repository.dataSequelize,
        };
      }
    }

    /**
     * authentication
     */
    if (dependencyPlugins.includes('winext-authorization')) {
      const app_authorization = loadModule('winext-authorization');

      if (!isEmpty(app_authorization)) {

        const authorizationParams = {
          config: authorizationConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('app_authorization')
        }

        app_authorization.register(authorizationParams);

        __app__.authorization = app_authorization;
      }
    }

    /**
     * run server
     */
    if (dependencyPlugins.includes('winext-runserver')) {
      const app_runserver = get(dependencyPlugins[i], 'app_runserver');

      if (!isEmpty(app_runserver)) {

        const serverParams = {
          config: serverConfig,
          requestId: requestId,
          repository: __app__.repository,
          loggerFactory: __app__.logger.getLogger('app_runserver'),
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

        app_runserver.register(serverParams);
        app_runserver.mappingTrigger.register(mappingTriggerParams);
        app_runserver.errorManager.register(errorManagerParams);

        __app__.server = {
          start: () => app_runserver.startup(),
          close: () => app_runserver.shutdown(),
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