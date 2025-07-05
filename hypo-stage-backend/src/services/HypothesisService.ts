import { LoggerService } from "@backstage/backend-plugin-api";
import { Hypothesis, HypothesisService } from "../types/hypothesis";
import { NotFoundError } from "@backstage/errors";

export async function createHypothesisService({
  logger,
}: {
  logger: LoggerService;
}): Promise<HypothesisService> {
  logger.info('Initializing HypothesisService');

  const storedHypotheses = new Array<Hypothesis>(); // TODO use database

  return {
    async createHypothesis(input) {
      logger.info('Creating hypothesis', { input });

      const hypothesis: Hypothesis = {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: crypto.randomUUID(),
        ...input,
        status: 'Research',
        owner: 'unknown', // TODO associate with backstage entities
      };

      storedHypotheses.push(hypothesis);

      return hypothesis;
    },

    async getHypotheses() {
      logger.info('Getting hypotheses');

      return storedHypotheses;
    },

    async getHypothesis(id: string) {
      logger.info('Getting hypothesis', { id });

      const hypothesis =  storedHypotheses.find(h => h.id === id);

      if (!hypothesis) {
        throw new NotFoundError(`Hypothesis with id ${id} not found`);
      }

      return hypothesis;
    },
  }
}
