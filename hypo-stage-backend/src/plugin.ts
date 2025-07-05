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
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, httpRouter }) {

        const hypothesisService = await createHypothesisService({
          logger,
        });

        httpRouter.use(
          await createRouter({
            hypothesisService,
          }),
        );
      },
    });
  },
});
