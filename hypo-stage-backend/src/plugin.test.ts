import request from 'supertest';
import { mockServices, startTestBackend } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { hypoStagePlugin } from './plugin';

describe('hypoStagePlugin without the agents module', () => {
  it('lists hypotheses', async () => {
    const { server } = await startTestBackend({
      features: [
        hypoStagePlugin,
        catalogServiceMock.factory(),
        mockServices.rootConfig.factory({ data: {} }),
      ],
    });

    const response = await request(server).get('/api/hypo-stage/hypotheses');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
