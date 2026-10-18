import crypto from 'crypto';
import request from 'supertest';
import { mockServices, startTestBackend } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { hypoStageAgentsModule } from './plugin';

const SECRET = 'boot-secret';

describe('hypoStageAgentsModule', () => {
  it('boots, runs migrations and serves the webhook and review routes', async () => {
    const { server } = await startTestBackend({
      features: [
        hypoStageAgentsModule,
        catalogServiceMock.factory(),
        mockServices.rootConfig.factory({
          data: {
            hypoStage: {
              github: { webhookSecret: SECRET },
              agents: {
                enabled: true,
                models: [{ key: 'local', provider: 'ollama', modelId: 'qwen2.5:7b' }],
                repositories: [{ repository: 'acme/app', model: 'local' }],
              },
            },
          },
        }),
      ],
    });

    const health = await request(server).get('/api/hypo-stage/agents/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({
      status: 'ok',
      enabled: true,
      queue: false,
      coach: { enabled: false, checkOnSave: true },
      planner: { enabled: false },
      issues: { triage: false, planIssues: false },
      coverage: { enabled: false },
    });

    const body = JSON.stringify({ zen: 'Keep it logically awesome.' });
    const signature = `sha256=${crypto.createHmac('sha256', SECRET).update(body).digest('hex')}`;
    const ping = await request(server)
      .post('/api/hypo-stage/webhooks/github')
      .set('content-type', 'application/json')
      .set('x-github-event', 'ping')
      .set('x-hub-signature-256', signature)
      .send(body);
    expect(ping.status).toBe(200);

    // The review route still requires a user
    const review = await request(server)
      .patch('/api/hypo-stage/agent-suggestions/22222222-2222-4222-8222-222222222222')
      .set('authorization', 'Bearer invalid')
      .send({ status: 'accepted' });
    expect(review.status).toBe(401);
  });
});
