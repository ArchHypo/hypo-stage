import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { createHypothesisService } from './services/HypothesisService';

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
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, database, httpRouter }) {
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
        const router = await createRouter({ hypothesisService });
        httpRouter.use(router);
      },
    });
  },
});
