import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'hypo-stage',
});

export const createHypothesisRouteRef = createRouteRef({
  id: 'hypo-stage/create-hypothesis',
});
