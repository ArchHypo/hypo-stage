import request from 'supertest';
import express from 'express';
import { NotFoundError } from '@backstage/errors';
import { createRouter } from './router';
import { HypothesisService } from './types/hypothesis';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { HttpAuthService } from '@backstage/backend-plugin-api';

describe('HypoStage Router', () => {
  let app: express.Application;
  let mockHypothesisService: jest.Mocked<HypothesisService>;
  let mockCatalogService: jest.Mocked<CatalogService>;
  let mockHttpAuth: jest.Mocked<HttpAuthService>;

  beforeEach(() => {
    mockHypothesisService = {
      create: jest.fn(),
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      getEvents: jest.fn(),
      deleteHypothesis: jest.fn(),
      createTechnicalPlanning: jest.fn(),
      updateTechnicalPlanning: jest.fn(),
      deleteTechnicalPlanning: jest.fn(),
    } as any;

    mockCatalogService = {
      getEntities: jest.fn().mockResolvedValue({
        items: [],
      }),
    } as any;

    mockHttpAuth = {
      credentials: jest.fn().mockResolvedValue({}),
    } as any;

    app = express();
    app.use(express.json());
    // Prevent default Express error logging after test completes
    app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (!res.headersSent) {
        res.status(500).send();
      }
    });
  });

  describe('DELETE /hypotheses/:id', () => {
    it('should delete a hypothesis successfully', async () => {
      const hypothesisId = 'test-hypothesis-id';
      mockHypothesisService.deleteHypothesis.mockResolvedValue(undefined);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .delete(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .expect(204);

      expect(mockHypothesisService.deleteHypothesis).toHaveBeenCalledWith(hypothesisId);
      expect(response.body).toEqual({});
    });

    it('should return 500 when delete fails', async () => {
      const hypothesisId = 'test-hypothesis-id';
      mockHypothesisService.deleteHypothesis.mockRejectedValue(
        new Error('Hypothesis not found'),
      );

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      await request(app)
        .delete(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .expect(500);

      expect(mockHypothesisService.deleteHypothesis).toHaveBeenCalledWith(
        hypothesisId,
      );
    });
  });

  describe('GET /hypotheses/:id', () => {
    it('should return a hypothesis by id', async () => {
      const hypothesisId = '9f5332a1-8e9c-4234-a4c0-56cb25813322';
      const mockHypothesis = {
        id: hypothesisId,
        statement: 'Test hypothesis',
        status: 'Open',
        entityRefs: ['component:default/foo'],
        createdAt: new Date(),
        updatedAt: new Date(),
        technicalPlannings: [],
      };
      mockHypothesisService.getById.mockResolvedValue(mockHypothesis as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .expect(200);

      expect(mockHypothesisService.getById).toHaveBeenCalledWith(hypothesisId);
      expect(response.body.id).toBe(hypothesisId);
      expect(response.body.statement).toBe('Test hypothesis');
    });

    it('should return 404 when hypothesis not found', async () => {
      const hypothesisId = 'non-existent-id';
      mockHypothesisService.getById.mockRejectedValue(
        new NotFoundError(`Hypothesis not found: ${hypothesisId}`),
      );

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app).get(
        `/api/hypo-stage/hypotheses/${hypothesisId}`,
      );
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Hypothesis not found');
    });
  });

  describe('GET /hypotheses', () => {
    it('should return all hypotheses', async () => {
      const mockHypotheses = [
        {
          id: '1',
          statement: 'Test hypothesis',
          status: 'Open',
          entityRefs: ['component:default/foo'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('1');
      expect(response.body[0].statement).toBe('Test hypothesis');
      expect(response.body[0].status).toBe('Open');
    });

    it('should filter by entityRef when query param is provided', async () => {
      const mockHypotheses = [
        { id: '1', statement: 'H1', entityRefs: ['component:default/foo'], status: 'Open', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', statement: 'H2', entityRefs: ['component:default/bar'], status: 'Open', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses')
        .query({ entityRef: 'component:default/foo' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('1');
    });

    it('should filter by team when query param is provided', async () => {
      const mockHypotheses = [
        { id: '1', statement: 'H1', entityRefs: ['component:default/foo'], status: 'Open', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);
      mockCatalogService.getEntities.mockResolvedValue({
        items: [
          { kind: 'component', metadata: { name: 'foo', namespace: 'default' }, spec: { team: 'TeamA' } },
        ] as any,
      });

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses')
        .query({ team: 'TeamA' })
        .expect(200);

      expect(mockCatalogService.getEntities).toHaveBeenCalledWith(
        { filter: { kind: 'component', 'spec.team': 'TeamA' } },
        { credentials: {} },
      );
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('1');
    });
  });

  describe('GET /hypotheses/referenced-entity-refs', () => {
    it('should return sorted unique entity refs from all hypotheses', async () => {
      const mockHypotheses = [
        {
          id: '1',
          entityRefs: ['component:default/foo', 'component:default/bar'],
          statement: 'H1',
          status: 'Open',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          entityRefs: ['component:default/bar'],
          statement: 'H2',
          status: 'Open',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses/referenced-entity-refs')
        .expect(200);

      expect(response.body).toEqual(['component:default/bar', 'component:default/foo']);
    });
  });

  describe('GET /hypotheses/teams', () => {
    it('should return sorted list of teams from hypotheses linked components', async () => {
      const mockHypotheses = [
        { id: '1', entityRefs: ['component:default/foo'], statement: 'H1', status: 'Open', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);
      mockCatalogService.getEntities.mockResolvedValue({
        items: [
          { kind: 'component', metadata: { name: 'foo', namespace: 'default' }, spec: { team: 'TeamB' } },
        ] as any,
      });

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses/teams')
        .expect(200);

      expect(response.body).toEqual(['TeamB']);
    });
  });

  describe('GET /hypotheses/stats', () => {
    it('should return total, byStatus, byUncertainty, byImpact and inLast30Days for all hypotheses', async () => {
      const now = new Date();
      const mockHypotheses = [
        {
          id: '1',
          entityRefs: ['component:default/foo'],
          statement: 'H1',
          status: 'Open',
          uncertainty: 'High',
          impact: 'Medium',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2',
          entityRefs: ['component:default/bar'],
          statement: 'H2',
          status: 'In Review',
          uncertainty: 'High',
          impact: 'High',
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses/stats')
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.byStatus).toEqual({ Open: 1, 'In Review': 1 });
      expect(response.body.byUncertainty).toEqual({ High: 2 });
      expect(response.body.byImpact).toEqual({ Medium: 1, High: 1 });
      expect(response.body.inLast30Days).toBe(2);
      expect(response.body.needAttention).toBe(1);
      expect(response.body.canPostpone).toBe(0);
    });

    it('should filter stats by entityRef when query param is provided', async () => {
      const mockHypotheses = [
        { id: '1', entityRefs: ['component:default/foo'], statement: 'H1', status: 'Open', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', entityRefs: ['component:default/bar'], statement: 'H2', status: 'Validated', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses/stats')
        .query({ entityRef: 'component:default/foo' })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.byStatus).toEqual({ Open: 1 });
      expect(response.body.inLast30Days).toBe(1);
    });

    it('should filter stats by sinceDays when provided', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const mockHypotheses = [
        { id: '1', entityRefs: [], statement: 'H1', status: 'Open', createdAt: oldDate, updatedAt: oldDate },
      ];
      mockHypothesisService.getAll.mockResolvedValue(mockHypotheses as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .get('/api/hypo-stage/hypotheses/stats')
        .query({ sinceDays: 90 })
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.byStatus).toEqual({});
      expect(response.body.inLast30Days).toBe(0);
      expect(response.body.needAttention).toBe(0);
      expect(response.body.canPostpone).toBe(0);
    });
  });

  describe('POST /hypotheses', () => {
    it('should create a hypothesis', async () => {
      const input = {
        statement: 'New hypothesis with at least twenty chars',
        entityRefs: [],
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: [] as string[],
        uncertainty: 'Medium' as const,
        impact: 'High' as const,
        notes: null,
      };
      const mockHypothesis = {
        id: '1',
        ...input,
        status: 'Open',
        technicalPlannings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockHypothesisService.create.mockResolvedValue(mockHypothesis as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .post('/api/hypo-stage/hypotheses')
        .send(input)
        .expect(201);

      expect(response.body.id).toBe('1');
      expect(response.body.statement).toBe(input.statement);
      expect(mockHypothesisService.create).toHaveBeenCalledWith(input);
    });
  });

  describe('POST /hypotheses/:id/technical_plannings', () => {
    it('should create technical planning with uncertainty and impact', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
        uncertainty: 'High' as const,
        impact: 'Low' as const,
      };
      const mockTechPlan = { id: 'tp-1', ...input };
      mockHypothesisService.createTechnicalPlanning.mockResolvedValue(mockTechPlan as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .post(`/api/hypo-stage/hypotheses/${hypothesisId}/technical_plannings`)
        .send(input)
        .expect(201);

      expect(response.body.id).toBe('tp-1');
      expect(mockHypothesisService.createTechnicalPlanning).toHaveBeenCalledWith(
        hypothesisId,
        input,
      );
    });

    it('should create technical planning without uncertainty and impact', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRef: 'component:default/foo',
        actionType: 'Experiment' as const,
        description: 'Test description',
        expectedOutcome: 'Test outcome',
        documentations: ['https://example.com'],
        targetDate: '2026-06-01',
      };
      const mockTechPlan = { id: 'tp-2', ...input };
      mockHypothesisService.createTechnicalPlanning.mockResolvedValue(mockTechPlan as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .post(`/api/hypo-stage/hypotheses/${hypothesisId}/technical_plannings`)
        .send(input)
        .expect(201);

      expect(response.body.id).toBe('tp-2');
      expect(mockHypothesisService.createTechnicalPlanning).toHaveBeenCalledWith(
        hypothesisId,
        input,
      );
    });
  });

  describe('PUT /technical_plannings/:id', () => {
    it('should update technical planning with uncertainty and impact', async () => {
      const techPlanId = 'tp-1';
      const input = {
        expectedOutcome: 'Updated outcome',
        documentations: ['https://example.com/updated'],
        uncertainty: 'Very High' as const,
        impact: 'Medium' as const,
      };
      const mockTechPlan = { id: techPlanId, ...input };
      mockHypothesisService.updateTechnicalPlanning.mockResolvedValue(mockTechPlan as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .put(`/api/hypo-stage/technical_plannings/${techPlanId}`)
        .send(input)
        .expect(200);

      expect(response.body.id).toBe(techPlanId);
      expect(mockHypothesisService.updateTechnicalPlanning).toHaveBeenCalledWith(
        techPlanId,
        input,
      );
    });
  });

  describe('PUT /hypotheses/:id', () => {
    it('should update hypothesis without uncertainty and impact fields', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRefs: ['component:default/foo'],
        statement: 'Updated hypothesis statement with at least twenty characters.',
        status: 'In Review' as const,
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: ['Performance' as const],
        notes: null,
      };
      const mockHypothesis = {
        id: hypothesisId,
        ...input,
        uncertainty: 'Medium',
        impact: 'High',
        technicalPlannings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockHypothesisService.update.mockResolvedValue(mockHypothesis as any);

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .put(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .send(input)
        .expect(200);

      expect(response.body.id).toBe(hypothesisId);
      expect(mockHypothesisService.update).toHaveBeenCalledWith(hypothesisId, input);
    });

    it('should reject update with uncertainty and impact fields', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRefs: ['component:default/foo'],
        statement: 'Another valid hypothesis statement for the router update test.',
        status: 'In Review' as const,
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: ['Performance' as const],
        uncertainty: 'High',
        impact: 'Low',
        notes: null,
      };

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      await request(app)
        .put(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .send(input)
        .expect(200);

      expect(mockHypothesisService.update).toHaveBeenCalled();
      const payload = mockHypothesisService.update.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('uncertainty');
      expect(payload).not.toHaveProperty('impact');
    });

    it('should not update hypothesis when statement is too short', async () => {
      const hypothesisId = 'hyp-1';
      const input = {
        entityRefs: ['component:default/foo'],
        statement: 'Too short',
        status: 'In Review' as const,
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: ['Performance' as const],
        notes: null,
      };

      const router = await createRouter({
        httpAuth: mockHttpAuth,
        hypothesisService: mockHypothesisService,
        catalogService: mockCatalogService,
      });
      app.use('/api/hypo-stage', router);

      const response = await request(app)
        .put(`/api/hypo-stage/hypotheses/${hypothesisId}`)
        .send(input);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(mockHypothesisService.update).not.toHaveBeenCalled();
    });
  });
});
