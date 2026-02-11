import { default as React } from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { hypoStagePlugin, HypoStagePage, CreateHypothesisPage, HypothesisPage, EditHypothesisPage } from '../src/plugin';

createDevApp()
  .registerPlugin(hypoStagePlugin)
  .addPage({
    element: <HypoStagePage />,
    title: 'Root Page',
    path: '/hypo-stage',
  })
  .addPage({
    element: <CreateHypothesisPage />,
    title: 'Create Hypothesis Page',
    path: '/hypo-stage/create-hypothesis',
  })
  .addPage({
    element: <HypothesisPage />,
    title: 'Hypothesis Page',
    path: '/hypo-stage/hypothesis/:id',
  })
  .addPage({
    element: <EditHypothesisPage />,
    title: 'Edit Hypothesis Page',
    path: '/hypo-stage/hypothesis/:id/edit',
  })
  .render();
