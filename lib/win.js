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
   * Required Dependencies : winext-logger', 'winext-error-manager'
   */
  const loggerFactory = loadModule('winext-logger');
  if (!loggerFactory) {
    throw new Error('RequiredModuleWinextLogger');
  }
  const errorManager = loadModule('winext-error-manager');
  if (errorManager) {
    errorManager.register({
      loggerFactory: loggerFactory.getLogger('winext_error_manager'),
      loggerTracer: loggerFactory.getLogTracer('winext_error_manager'),
      requestId: requestId
    });
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
      forOwn(plugins, (value, key) => {
        let plugin = '';
        if (key.includes('_')) {
          plugin = key.replace(/_/g, '-');
        }
        if (!dependencies.includes(plugin)) {
          throw new Error('NotFoundModuleInDependencies');
        }
      });
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
        throw new errorManager.configNotFound(error);
    }
  }
}

function building(params = {}) {
  try {
    const __app__ = {};

    const sandboxConfig = get(params, 'sandbox', {});
    const dependencyPlugins = get(params, 'dependencies', []);
    const modelDescriptorMongo = get(params, 'modelMongo', []);
    const modelDescriptorSQL = get(params, 'modelSQL', []);

    /**
     * config
     */
    const dependencyConfig = get(sandboxConfig, 'application.dependencies');
    const loggerConfig = get(dependencyConfig, 'winext_logger');
    const serverConfig = get(dependencyConfig, 'winext_runserver');
    const repositoryConfig = get(dependencyConfig, 'winext_repository');
    const authorizationConfig = get(dependencyConfig, 'winext_authorization');
    const errorCodesConfig = get(dependencyConfig, 'winext_error_manager');
    const routerMappingsConfig = get(dependencyConfig, 'winext_mapping_store');
    const serviceRegistryConfig = get(dependencyConfig, 'winext_service_registry');

    /**
     * logger
     */
    if (dependencyPlugins.includes('winext-logger')) {
      const winextLogger = loadModule('winext-logger');

      if (!isEmpty(winextLogger)) {
        const loggerParams = {
          config: loggerConfig
        };

        winextLogger.register(loggerParams);

        __app__.logger = winextLogger;
      }
    }

    /**
     * error manager
     */
    if (dependencyPlugins.includes('winext-error-manager')) {
      const winextErrorManager = loadModule('winext-error-manager');

      if (!isEmpty(winextErrorManager)) {
        const errorManagerParams = {
          config: errorCodesConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_error_manager'),
          loggerTracer: __app__.logger.getLogTracer('winext_error_manager')
        };

        winextErrorManager.register(errorManagerParams);

        __app__.errorManager = winextErrorManager;
      }
    }

    /**
     *  repository
     */
    if (dependencyPlugins.includes('winext-repository')) {
      const winextRepository = loadModule('winext-repository');

      if (!isEmpty(winextRepository)) {
        const repoParams = {
          config: repositoryConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_repository'),
          loggerTracer: __app__.logger.getLogTracer('winext_repository'),
          errorManager: __app__.errorManager
        };

        const dataStoreTriggerParams = {
          modelDescriptor: modelDescriptorMongo,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_store_trigger'),
          loggerTracer: __app__.logger.getLogTracer('data_store_trigger'),
          errorManager: __app__.errorManager
        };

        const dataSequelizeTriggerParams = {
          config: repositoryConfig,
          modelDescriptor: modelDescriptorSQL,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('data_sequelize_trigger'),
          loggerTracer: __app__.logger.getLogTracer('data_sequelize_trigger'),
          errorManager: __app__.errorManager
        };

        winextRepository.register(repoParams);
        winextRepository.dataStore.register(dataStoreTriggerParams);
        winextRepository.dataSequelize.register(dataSequelizeTriggerParams);

        __app__.repository = {
          startMongoose: () => winextRepository.startupMongoose(),
          closeMongoose: () => winextRepository.shutdownMongoose(),
          startMySql: () => winextRepository.startupMySql(),
          closeMySql: () => winextRepository.shutdownMySql(),
          dataStore: winextRepository.dataStore,
          dataSequelize: winextRepository.dataSequelize
        };
      }
    }

    /**
     * authentication
     */
    if (dependencyPlugins.includes('winext-authorization')) {
      const winextAuthorization = loadModule('winext-authorization');

      if (!isEmpty(winextAuthorization)) {
        const authorizationParams = {
          config: authorizationConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_authorization'),
          loggerTracer: __app__.logger.getLogTracer('winext_authorization'),
          errorManager: __app__.errorManager
        };

        winextAuthorization.register(authorizationParams);

        __app__.authorization = winextAuthorization;
      }
    }

    /**
     * mapping store
     */
    if (dependencyPlugins.includes('winext-mapping-store')) {
      const winextMappingStore = loadModule('winext-mapping-store');

      if (!isEmpty(winextMappingStore)) {
        const mappingStoreParams = {
          config: serverConfig,
          mappings: get(routerMappingsConfig, 'routerMappings', []),
          requestId: requestId,
          repository: __app__.repository,
          authorization: __app__.authorization,
          loggerFactory: __app__.logger.getLogger('mapping_trigger'),
          loggerTracer: __app__.logger.getLogTracer('winext_mapping_store'),
          errorManager: __app__.errorManager
        };

        winextMappingStore.register(mappingStoreParams);

        __app__.mappingStore = winextMappingStore;
      }
    }

    /**
     * service registry
     */
    if (dependencyPlugins.includes('winext-service-registry')) {
      const winextServiceRegistry = loadModule('winext-service-registry');

      if (!isEmpty(winextServiceRegistry)) {
        const serviceRegistryParams = {
          config: serviceRegistryConfig,
          requestId: requestId,
          loggerFactory: __app__.logger.getLogger('winext_service_registry'),
          loggerTracer: __app__.logger.getLogTracer('winext_service_registry'),
          errorManager: __app__.errorManager
        };

        winextServiceRegistry.register(serviceRegistryParams);

        __app__.registry = winextServiceRegistry;
      }
    }

    /**
     * run server
     */
    if (dependencyPlugins.includes('winext-runserver')) {
      const winextRunserver = loadModule('winext-runserver');

      if (!isEmpty(winextRunserver)) {
        const serverParams = {
          config: serverConfig,
          requestId: requestId,
          repository: __app__.repository,
          registry: __app__.registry,
          loggerFactory: __app__.logger.getLogger('winext_runserver'),
          loggerTracer: __app__.logger.getLogTracer('winext_runserver'),
          errorManager: __app__.errorManager,
          mappingStore: __app__.mappingStore
        };

        winextRunserver.register(serverParams);

        __app__.server = {
          start: () => winextRunserver.startup(),
          close: () => winextRunserver.shutdown()
        };
      }
    }

    return __app__;
  } catch (error) {
    return Promise.reject(error);
  }
}

winnext.initializer = initializer;
winnext.require = loadModule;

exports = module.exports = winnext;
