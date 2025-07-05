import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const hypoStagePlugin = createPlugin({
  id: 'hypo-stage',
  routes: {
    root: rootRouteRef,
  },
});

export const HypoStagePage = hypoStagePlugin.provide(
  createRoutableExtension({
    name: 'HypoStagePage',
    component: () =>
      import('./pages/HomePage').then(m => m.HomePage),
    mountPoint: rootRouteRef,
  }),
);
