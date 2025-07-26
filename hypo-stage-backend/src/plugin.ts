import {
  coreServices,
  createBackendPlugin,
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
