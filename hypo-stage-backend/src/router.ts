import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { HypothesisService } from './types/hypothesis';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { createHypothesisSchema, updateHypothesisSchema } from './schemas/hypothesis';

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
  router.use(express.json());

  router.get('/hypotheses/entity-refs', async (req, res) => {
    // https://backstage.io/docs/backend-system/core-services/http-auth/#getting-request-credentials
    const auth = await httpAuth.credentials(req);
    const entities = await catalogService.getEntities({filter: {
      kind: 'component',
    }}, { credentials: auth });

    res.json(entities.items.map(entity => stringifyEntityRef(entity)));
  });

  router.post('/hypotheses', async (req, res) => {
    const parsed = createHypothesisSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const createdHypothesis = await hypothesisService.create(parsed.data);

    res.status(201).json(createdHypothesis);
  });

  router.get('/hypotheses', async (_req, res) => {
    const hypotheses = await hypothesisService.getAll();

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

  return router;
}
