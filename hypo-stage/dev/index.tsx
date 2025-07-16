import { createDevApp } from '@backstage/dev-utils';
import { hypoStagePlugin, HypoStagePage } from '../src/plugin';

createDevApp()
  .registerPlugin(hypoStagePlugin)
  .addPage({
    element: <HypoStagePage />,
    title: 'Root Page',
    path: '/hypo-stage',
  })
  .render();
