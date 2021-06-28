'use strict';

const Promise = require('bluebird');
const lodash = require('lodash');
const {
  loadModule,
  requestId
} = require('../utils/helper');
const {
  get,
  isEmpty,
  forOwn
} = lodash;

const winnext = {};

function initializer(sandbox = {}, dependencies = [], models = {}) {

  let modelMongo = [];
  let modelSQL = [];

  /**
   * Required Dependencies : ['winext-logger', 'winext-error-manager']
   */
  const loggerFactory = loadModule('winext-logger');
  if (!loggerFactory) {
    throw new Error('RequiredModuleWinextLogger');
  }
  const errorManager = loadModule('winext-error-manager');
  if (errorManager) {
    errorManager.register({
      loggerFactory: loggerFactory.getLogger('winext_error_manager'),
      requestId: requestId
    })
  } else {
    throw new Error('RequiredModuleWinextErrorManager');
  }

  try {

    /**
     * SandBoxConfig
     */
    if (!isEmpty(sandbox)) {
      const application = get(sandbox, 'application', {});
      if (!isEmpty(application)) {
        const plugins = get(application, 'dependencies', {});
        if (isEmpty(plugins)) {
          throw new Error('PluginConfigNotFoundInApplications');
        }
      } else {
        throw new Error('ApplicationConfigNotFound');
      }
    } else {
      throw new Error('SandboxConfigNotFound');
    }

    /**
     * Dependencies
     */
    if (!isEmpty(dependencies)) {
      const application = get(sandbox, 'application', {});
      const plugins = get(application, 'dependencies', {});
      forOwn(plugins, ((value, key) => {
        let plugin = '';
        if (key.includes('_')) {
          plugin = key.replace(/_/g, '-');
        }
        if (!dependencies.includes(plugin)) {
          throw new Error('NotFoundModuleInDependencies');
        }
      }))
    } else {
      throw new Error('DependenciesNotFound');
    }

    /**
     * Models
     */
    if (!isEmpty(models)) {
      modelMongo = !isEmpty(models.mongo) ? loadModule(models.mongo) : [];
      modelSQL = !isEmpty(models.sql) ? loadModule(models.sql) : [];
    }

    return building({ sandbox, dependencies, modelMongo, modelSQL });

  } catch (error) {
    switch (true) {
      case error.message === 'RequiredModuleWinextLogger':
        throw new errorManager.requiredModule(error, 'winext-logger');
      case error.message === 'RequiredModuleWinextErrorManager':
        throw new errorManager.requiredModule(error, 'winext-error-manager');
      default:
        throw errorManager.configNotFound(error);
    }
  }
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
    const errorCodesConfig = get(dependencyConfig, 'winext_error_manager');

    const routerMappingsConfig = get(sandboxConfig, 'application.routerMappings');

    /**
     * error manager
     */
    if (dependencyPlugins.includes('winext-error-manager')) {
      const winext_error_manager = loadModule('winext-error-manager');

      if (!isEmpty(winext_error_manager)) {

        const errorManagerParams = {
          config: errorCodesConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_error_manager'),
        }

        winext_error_manager.register(errorManagerParams);

        __app__.errorManager = winext_error_manager;
      }
    }
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
          errorManager: __app__.errorManager
        };

        const dataStoreTriggerParams = {
          modelDescriptor: modelDescriptorMongo,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_store_trigger'),
          errorManager: __app__.errorManager
        };

        const dataSequelizeTriggerParams = {
          config: repositoryConfig,
          modelDescriptor: modelDescriptorSQL,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_sequelize_trigger'),
          errorManager: __app__.errorManager
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
          loggerFactory: __app__.logger.getLogger('winext_authorization'),
          errorManager: __app__.errorManager
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
          errorManager: __app__.errorManager
        };

        const mappingTriggerParams = {
          config: serverConfig,
          mappings: routerMappingsConfig,
          requestId: requestId,
          repository: __app__.repository,
          authorization: __app__.authorization,
          loggerFactory: __app__.logger.getLogger('mapping_trigger'),
          errorManager: __app__.errorManager
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

  } catch (error) {
    return Promise.reject(error);
  }
};

winnext.initializer = initializer;
winnext.require = loadModule;

exports = module.exports = winnext;