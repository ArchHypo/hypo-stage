import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef, createHypothesisRouteRef, hypothesisRouteRef, editHypothesisRouteRef } from './routes';

export { HYPO_STAGE_FEATURE_FLAG } from './featureFlags';

export const hypoStagePlugin = createPlugin({
  id: 'hypo-stage',
  routes: {
    root: rootRouteRef,
    createHypothesis: createHypothesisRouteRef,
    hypothesis: hypothesisRouteRef,
    editHypothesis: editHypothesisRouteRef,
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

export const CreateHypothesisPage = hypoStagePlugin.provide(
  createRoutableExtension({
    name: 'CreateHypothesisPage',
    component: () =>
      import('./pages/CreateHypothesisPage').then(m => m.CreateHypothesisPage),
    mountPoint: createHypothesisRouteRef,
  }),
);

export const HypothesisPage = hypoStagePlugin.provide(
  createRoutableExtension({
    name: 'HypothesisPage',
    component: () =>
      import('./pages/HypothesisPage').then(m => m.HypothesisPage),
    mountPoint: hypothesisRouteRef,
  }),
);

export const EditHypothesisPage = hypoStagePlugin.provide(
  createRoutableExtension({
    name: 'EditHypothesisPage',
    component: () =>
      import('./pages/EditHypothesisPage').then(m => m.EditHypothesisPage),
    mountPoint: editHypothesisRouteRef,
  }),
);
