import { createDevApp } from '@backstage/dev-utils';
import { hypoStagePlugin, HypoStagePage, CreateHypothesisPage } from '../src/plugin';

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
  .render();
