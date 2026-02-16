import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { createHypothesisService } from './services/HypothesisService';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

/**
 * hypoStagePlugin backend plugin
 *
 * @public
 */
export const hypoStagePlugin = createBackendPlugin({
  pluginId: 'hypo-stage',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        database: coreServices.database,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalogService: catalogServiceRef,
      },
      async init({ logger, database, auth, httpAuth, httpRouter, catalogService }) {
        // https://backstage.io/docs/backend-system/core-services/database
        const client = await database.getClient();
        const migrationsDir = resolvePackagePath(
          '@internal/plugin-hypo-stage-backend',
          'migrations',
        );
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: migrationsDir,
          });
        }

        // Create hypothesis service
        const hypothesisService = await createHypothesisService({
          logger,
          database,
        });

        // Create and register router
        const router = await createRouter({ auth, httpAuth, hypothesisService, catalogService });
        httpRouter.use(router);
      },
    });
  },
});
