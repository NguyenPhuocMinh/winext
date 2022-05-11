'use strict';

const Promise = require('bluebird');
const lodash = require('lodash');
const { loadModule, loadRequestId, generateRequestID, parseSlug } = require('../utils/helper');
const { get, isEmpty, forOwn } = lodash;

const winext = {};

function initializer(sandbox = {}, dependencies = [], models = {}) {
  let modelMongo = [];
  let modelSQL = [];
  let modelGraphql = {};

  /**
   * Required Dependencies : 'winext-logger', 'winext-error-manager', 'winext-key-manager'
   */
  const loggerFactory = loadModule('winext-logger');
  if (!loggerFactory) {
    throw new Error('RequiredModuleWinextLogger');
  }
  const errorManager = loadModule('winext-error-manager');
  if (errorManager) {
    const requestIDErrorManager = generateRequestID();
    errorManager.register({
      loggerFactory: loggerFactory.getLogger('winext_error_manager'),
      loggerTracer: loggerFactory.getLogTracer('winext_error_manager'),
      requestId: requestIDErrorManager
    });
  } else {
    throw new Error('RequiredModuleWinextErrorManager');
  }
  const keyManager = loadModule('winext-key-manager');
  if (!keyManager) {
    throw new Error('RequiredModuleWinextKeyManager');
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
      forOwn(plugins, (_, key) => {
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
      modelGraphql = !isEmpty(models.graphql) ? loadModule(models.graphql) : {};
    }

    return building({ sandbox, dependencies, modelMongo, modelSQL, modelGraphql });
  } catch (error) {
    console.error('Initializer Error', error);
    switch (true) {
      case error.message === 'RequiredModuleWinextLogger':
        throw new errorManager.requiredModule(error, 'winext-logger');
      case error.message === 'RequiredModuleWinextErrorManager':
        throw new errorManager.requiredModule(error, 'winext-error-manager');
      case error.message === 'RequiredModuleWinextKeyStore':
        throw new errorManager.requiredModule(error, 'winext-key-store');
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
    const modelDescriptorGraphql = get(params, 'modelGraphql', {});

    /**
     * config
     */
    const dependencyConfig = get(sandboxConfig, 'application.dependencies');
    const loggerConfig = get(dependencyConfig, 'winext_logger');
    const serverConfig = get(dependencyConfig, 'winext_runserver');
    const repoStoreConfig = get(dependencyConfig, 'winext_repo_store');
    const authorizationConfig = get(dependencyConfig, 'winext_authorization');
    const errorManagerConfig = get(dependencyConfig, 'winext_error_manager');
    const keyManagerConfig = get(dependencyConfig, 'winext_key_manager');
    const mappingStoreConfig = get(dependencyConfig, 'winext_mapping_store');
    const serviceRegistryConfig = get(dependencyConfig, 'winext_service_registry');
    const apiGatewayConfig = get(dependencyConfig, 'winext_api_gateway');
    const redisStoreConfig = get(dependencyConfig, 'winext_redis_store');

    const routerMappings = get(mappingStoreConfig, 'routerMappings', []);
    const messageCodes = get(mappingStoreConfig, 'messageCodes', {});

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
      const requestIDErrorManager = generateRequestID();

      if (!isEmpty(winextErrorManager)) {
        const errorManagerParams = {
          config: errorManagerConfig,
          requestId: requestIDErrorManager,
          loggerFactory: __app__.logger.getLogger('winext_error_manager'),
          loggerTracer: __app__.logger.getLogTracer('winext_error_manager')
        };

        winextErrorManager.register(errorManagerParams);

        __app__.errorManager = winextErrorManager;
      }
    }

    /**
     * api gateway
     */
    if (dependencyPlugins.includes('winext-api-gateway')) {
      const winextApiGateway = loadModule('winext-api-gateway');
      const requestIDApiGateway = generateRequestID();

      if (!isEmpty(winextApiGateway)) {
        const apiGatewayParams = {
          config: apiGatewayConfig,
          authorizationConfig: authorizationConfig,
          requestId: requestIDApiGateway,
          loggerFactory: __app__.logger.getLogger('winext_api_gateway'),
          loggerTracer: __app__.logger.getLogTracer('winext_api_gateway'),
          errorManager: __app__.errorManager
        };

        winextApiGateway.register(apiGatewayParams);

        __app__.apiGateway = winextApiGateway;
      }
    }

    /**
     * service registry
     */
    if (dependencyPlugins.includes('winext-service-registry')) {
      const winextServiceRegistry = loadModule('winext-service-registry');
      const requestIDServiceRegistry = generateRequestID();

      if (!isEmpty(winextServiceRegistry)) {
        const serviceRegistryParams = {
          config: serviceRegistryConfig,
          requestId: requestIDServiceRegistry,
          loggerFactory: __app__.logger.getLogger('winext_service_registry'),
          loggerTracer: __app__.logger.getLogTracer('winext_service_registry'),
          errorManager: __app__.errorManager
        };

        winextServiceRegistry.register(serviceRegistryParams);

        __app__.serviceRegistry = winextServiceRegistry;
      }
    }

    /**
     * key store
     */
    if (dependencyPlugins.includes('winext-key-manager')) {
      const winextKeyManager = loadModule('winext-key-manager');
      const requestIDKeyStore = generateRequestID();

      if (!isEmpty(winextKeyManager)) {
        const keyManagerParams = {
          config: keyManagerConfig,
          requestId: requestIDKeyStore,
          loggerFactory: __app__.logger.getLogger('winext_key_store'),
          loggerTracer: __app__.logger.getLogTracer('winext_key_store'),
          errorManager: __app__.errorManager
        };

        winextKeyManager.register(keyManagerParams);

        __app__.keyManager = winextKeyManager;
      }
    }

    /**
     *  repo store
     */
    if (dependencyPlugins.includes('winext-repo-store')) {
      const winextRepoStore = loadModule('winext-repo-store');
      const requestIDRepoStore = generateRequestID();
      const requestIDMongoStore = generateRequestID();
      const requestIDSequelizeStore = generateRequestID();
      const requestIDGraphqlStore = generateRequestID();

      if (!isEmpty(winextRepoStore)) {
        const repoParams = {
          config: repoStoreConfig,
          modelGraphqlDescriptor: modelDescriptorGraphql,
          requestId: requestIDRepoStore,
          loggerFactory: __app__.logger.getLogger('winext_repo_store'),
          loggerTracer: __app__.logger.getLogTracer('winext_repo_store'),
          errorManager: __app__.errorManager
        };

        const dataMongoStoreParams = {
          modelDescriptor: modelDescriptorMongo,
          requestId: requestIDMongoStore,
          loggerFactory: __app__.logger.getLogger('data_mongo_store'),
          loggerTracer: __app__.logger.getLogTracer('data_mongo_store'),
          errorManager: __app__.errorManager
        };

        const dataSequelizeStoreParams = {
          config: repoStoreConfig,
          modelDescriptor: modelDescriptorSQL,
          requestId: requestIDSequelizeStore,
          loggerFactory: __app__.logger.getLogger('data_sequelize_store'),
          loggerTracer: __app__.logger.getLogTracer('data_sequelize_store'),
          errorManager: __app__.errorManager
        };

        const dataGraphqlStoreParams = {
          config: repoStoreConfig,
          modelDescriptor: modelDescriptorGraphql,
          requestId: requestIDGraphqlStore,
          loggerFactory: __app__.logger.getLogger('data_graphql_store'),
          loggerTracer: __app__.logger.getLogTracer('data_graphql_store'),
          errorManager: __app__.errorManager
        };

        winextRepoStore.register(repoParams);
        winextRepoStore.dataMongoStore.register(dataMongoStoreParams);
        winextRepoStore.dataSequelizeStore.register(dataSequelizeStoreParams);
        winextRepoStore.dataGraphqlStore.register(dataGraphqlStoreParams);

        __app__.repoStore = {
          startMongo: () => winextRepoStore.startMongo(),
          stopMongo: () => winextRepoStore.stopMongo(),
          startMySql: () => winextRepoStore.startMySql(),
          stopMySql: () => winextRepoStore.stopMySql(),
          startGraphql: (app, server, pathServer) => winextRepoStore.startGraphql(app, server, pathServer),
          stopGraphql: (server) => winextRepoStore.stopGraphql(server),
          dataMongoStore: winextRepoStore.dataMongoStore,
          dataSequelizeStore: winextRepoStore.dataSequelizeStore,
          dataGraphqlStore: winextRepoStore.dataGraphqlStore
        };
      }
    }

    /**
     * redis store
     */
    if (dependencyPlugins.includes('winext-redis-store')) {
      const winextRedisStore = loadModule('winext-redis-store');
      const requestIDRedisStore = generateRequestID();

      if (!isEmpty(winextRedisStore)) {
        const redisStoreParams = {
          config: redisStoreConfig,
          requestId: requestIDRedisStore,
          loggerFactory: __app__.logger.getLogger('winext_redis_store'),
          loggerTracer: __app__.logger.getLogTracer('winext_redis_store'),
          errorManager: __app__.errorManager
        };

        winextRedisStore.register(redisStoreParams);

        __app__.redisStore = {
          startRedis: () => winextRedisStore.startRedis(),
          stopRedis: () => winextRedisStore.stopRedis(),
          redisClient: winextRedisStore.redisClient
        };
      }
    }

    /**
     * authentication
     */
    if (dependencyPlugins.includes('winext-authorization')) {
      const winextAuthorization = loadModule('winext-authorization');
      const requestIDAuthorization = generateRequestID();

      if (!isEmpty(winextAuthorization)) {
        const authorizationParams = {
          config: authorizationConfig,
          requestId: requestIDAuthorization,
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
      const requestIDMappingStore = generateRequestID();

      if (!isEmpty(winextMappingStore)) {
        const mappingStoreParams = {
          config: serverConfig,
          mappings: routerMappings,
          messageCodes: messageCodes,
          requestId: requestIDMappingStore,
          repoStore: __app__.repoStore,
          redisStore: __app__.redisStore,
          authorization: __app__.authorization,
          loggerFactory: __app__.logger.getLogger('winext_mapping_store'),
          loggerTracer: __app__.logger.getLogTracer('winext_mapping_store'),
          errorManager: __app__.errorManager
        };

        winextMappingStore.register(mappingStoreParams);

        __app__.mappingStore = winextMappingStore;
      }
    }

    /**
     * run server
     */
    if (dependencyPlugins.includes('winext-runserver')) {
      const winextRunserver = loadModule('winext-runserver');
      const requestIDRunServer = generateRequestID();

      if (!isEmpty(winextRunserver)) {
        const serverParams = {
          config: serverConfig,
          requestId: requestIDRunServer,
          gatewayConfig: apiGatewayConfig,
          serviceRegistryConfig: serviceRegistryConfig,
          keyManagerConfig: keyManagerConfig,
          repoStoreConfig: repoStoreConfig,
          keyManager: __app__.keyManager,
          repoStore: __app__.repoStore,
          redisStore: __app__.redisStore,
          mappingStore: __app__.mappingStore,
          apiGateway: __app__.apiGateway,
          serviceRegistry: __app__.serviceRegistry,
          loggerFactory: __app__.logger.getLogger('winext_runserver'),
          loggerTracer: __app__.logger.getLogTracer('winext_runserver'),
          errorManager: __app__.errorManager
        };

        winextRunserver.register(serverParams);

        __app__.server = {
          start: () => winextRunserver.startServer(),
          stop: () => winextRunserver.stopServer()
        };
      }
    }

    return __app__;
  } catch (error) {
    console.error('Building error', error);
    return Promise.reject(error);
  }
}

winext.initializer = initializer;
winext.require = loadModule;
winext.requestIDParser = loadRequestId;
winext.parseSlug = parseSlug;

exports = module.exports = winext;
