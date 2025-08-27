import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'hypo-stage',
});

export const createHypothesisRouteRef = createRouteRef({
  id: 'hypo-stage/create-hypothesis',
});

export const hypothesisRouteRef = createRouteRef({
  id: 'hypo-stage/hypothesis',
  params: ['hypothesisId'],
});

export const editHypothesisRouteRef = createRouteRef({
  id: 'hypo-stage/edit-hypothesis',
  params: ['hypothesisId'],
});
