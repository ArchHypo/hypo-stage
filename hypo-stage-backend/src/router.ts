import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { createHypothesisSchema, HypothesisService } from './types/hypothesis';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';

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

    const createdHypothesis = await hypothesisService.createHypothesis(parsed.data);

    res.status(201).json(createdHypothesis);
  });

  router.get('/hypotheses', async (_req, res) => {
    const hypotheses = await hypothesisService.getHypotheses();

    res.json(hypotheses);
  });

  return router;
}
