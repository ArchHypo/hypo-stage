import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { createHypothesisSchema, HypothesisService } from './types/hypothesis';

export async function createRouter({
  hypothesisService,
}: {
  hypothesisService: HypothesisService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.post('/hypotheses', async (req, res) => {
    const parsed = createHypothesisSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const createdHypothesis = res.json(await hypothesisService.createHypothesis(parsed.data));

    res.status(201).json(createdHypothesis);
  });

  router.get('/hypotheses', async (_req, res) => {
    res.json(await hypothesisService.getHypotheses());
  });

  router.get('/hypotheses/:id', async (req, res) => {
    res.json(await hypothesisService.getHypothesis(req.params.id));
  });

  return router;
}
