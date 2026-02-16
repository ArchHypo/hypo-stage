import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { HypothesisService } from './types/hypothesis';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { createHypothesisSchema, updateHypothesisSchema, createTechnicalPlanningSchema, updateTechnicalPlanningSchema } from './schemas/hypothesis';

export async function createRouter({
  httpAuth,
  hypothesisService,
  catalogService,
}: {
  httpAuth: HttpAuthService;
  hypothesisService: HypothesisService;
  catalogService: CatalogService;
}): Promise<express.Router> {
  const router = Router();

  // CORS for standalone dev: allow only trusted origins when credentials are used.
  // Reflecting any request Origin with credentials: true would allow arbitrary sites to make credentialed requests.
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  router.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && allowedOrigins.has(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  router.use(express.json());

  router.get('/hypotheses/entity-refs', async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const entities = await catalogService.getEntities(
      { filter: { kind: 'component' } },
      { credentials },
    );
    res.json(entities.items.map(entity => stringifyEntityRef(entity)));
  });

  router.get('/hypotheses/teams', async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const [hypotheses, catalogResponse] = await Promise.all([
      hypothesisService.getAll(),
      catalogService.getEntities({ filter: { kind: 'component' } }, { credentials }),
    ]);
    const refsSet = new Set<string>();
    for (const h of hypotheses) {
      for (const ref of h.entityRefs || []) refsSet.add(ref);
    }
    const teams = new Set<string>();
    for (const entity of catalogResponse.items) {
      if (refsSet.has(stringifyEntityRef(entity))) {
        const team = (entity as { spec?: { team?: string } }).spec?.team;
        if (team) teams.add(team);
      }
    }
    res.json(Array.from(teams).sort());
  });

  router.get('/hypotheses/referenced-entity-refs', async (_req, res) => {
    const hypotheses = await hypothesisService.getAll();
    const refsSet = new Set<string>();
    for (const h of hypotheses) {
      for (const ref of h.entityRefs || []) refsSet.add(ref);
    }
    res.json(Array.from(refsSet).sort());
  });

  /** Lightweight stats for dashboard: same filters as GET /hypotheses, optional time bound (sinceDays). */
  router.get('/hypotheses/stats', async (req, res) => {
    const entityRef = req.query.entityRef as string | undefined;
    const team = req.query.team as string | undefined;
    const sinceDays = req.query.sinceDays !== undefined ? Number(req.query.sinceDays) : undefined;

    let hypotheses = await hypothesisService.getAll();

    if (entityRef) {
      hypotheses = hypotheses.filter(
        h => Array.isArray(h.entityRefs) && h.entityRefs.includes(entityRef),
      );
    }

    if (team) {
      const credentials = await httpAuth.credentials(req);
      const entities = await catalogService.getEntities(
        { filter: { kind: 'component', 'spec.team': team } },
        { credentials },
      );
      const teamRefs = new Set(entities.items.map(e => stringifyEntityRef(e)));
      hypotheses = hypotheses.filter(
        h => Array.isArray(h.entityRefs) && h.entityRefs.some(ref => teamRefs.has(ref)),
      );
    }

    const cutoff =
      sinceDays !== undefined && Number.isFinite(sinceDays) && sinceDays > 0
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
        : null;
    const filtered = cutoff
      ? hypotheses.filter(h => new Date(h.updatedAt) >= cutoff)
      : hypotheses;

    const byStatus: Record<string, number> = {};
    const byUncertainty: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    let inLast30Days = 0;
    let needAttention = 0;
    let canPostpone = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const highUncertainty = (u: string) => u === 'High' || u === 'Very High';
    const highImpact = (i: string) => i === 'High' || i === 'Very High';
    const lowImpact = (i: string) => i === 'Very Low' || i === 'Low';

    for (const h of filtered) {
      byStatus[h.status] = (byStatus[h.status] ?? 0) + 1;
      byUncertainty[h.uncertainty] = (byUncertainty[h.uncertainty] ?? 0) + 1;
      byImpact[h.impact] = (byImpact[h.impact] ?? 0) + 1;
      if (new Date(h.createdAt) >= thirtyDaysAgo) inLast30Days += 1;
      if (highUncertainty(h.uncertainty) && highImpact(h.impact)) needAttention += 1;
      if (lowImpact(h.impact)) canPostpone += 1;
    }

    res.json({
      total: filtered.length,
      byStatus,
      byUncertainty,
      byImpact,
      inLast30Days,
      needAttention,
      canPostpone,
    });
  });

  router.post('/hypotheses', async (req, res) => {
    const parsed = createHypothesisSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const createdHypothesis = await hypothesisService.create(parsed.data);

    res.status(201).json(createdHypothesis);
  });

  router.get('/hypotheses', async (req, res) => {
    const entityRef = req.query.entityRef as string | undefined;
    const team = req.query.team as string | undefined;

    let hypotheses = await hypothesisService.getAll();

    if (entityRef) {
      hypotheses = hypotheses.filter(
        h => Array.isArray(h.entityRefs) && h.entityRefs.includes(entityRef),
      );
    }

    if (team) {
      const credentials = await httpAuth.credentials(req);
      const entities = await catalogService.getEntities(
        { filter: { kind: 'component', 'spec.team': team } },
        { credentials },
      );
      const teamRefs = new Set(entities.items.map(e => stringifyEntityRef(e)));
      hypotheses = hypotheses.filter(
        h => Array.isArray(h.entityRefs) && h.entityRefs.some(ref => teamRefs.has(ref)),
      );
    }

    res.json(hypotheses);
  });

  router.put('/hypotheses/:id', async (req, res) => {
    const parsed = updateHypothesisSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const updatedHypothesis = await hypothesisService.update(req.params.id, parsed.data);

    res.json(updatedHypothesis);
  });

  router.get('/hypotheses/:id/events', async (req, res) => {
    const events = await hypothesisService.getEvents(req.params.id);

    res.json(events);
  });

  router.delete('/hypotheses/:id', async (req, res) => {
    await hypothesisService.deleteHypothesis(req.params.id);

    res.status(204).send();
  });

  router.post('/hypotheses/:id/technical_plannings', async (req, res) => {
    const parsed = createTechnicalPlanningSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const createdTechPlan = await hypothesisService.createTechnicalPlanning(req.params.id, parsed.data);

    res.status(201).json(createdTechPlan);
  });

  router.put('/technical_plannings/:id', async (req, res) => {
    const parsed = updateTechnicalPlanningSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const updatedTechPlan = await hypothesisService.updateTechnicalPlanning(req.params.id, parsed.data);

    res.json(updatedTechPlan);
  });

  router.delete('/technical_plannings/:id', async (req, res) => {
    await hypothesisService.deleteTechnicalPlanning(req.params.id);

    res.status(204).send();
  });

  return router;
}
