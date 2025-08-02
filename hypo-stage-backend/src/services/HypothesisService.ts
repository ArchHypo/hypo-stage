import { DatabaseService, LoggerService } from "@backstage/backend-plugin-api";
import { Hypothesis, HypothesisService } from "../types/hypothesis";

export async function createHypothesisService({
  logger,
  database,
}: {
  logger: LoggerService;
  database: DatabaseService;
}): Promise<HypothesisService> {
  logger.info('Initializing HypothesisService');

  const db = await database.getClient();

  return {
    async createHypothesis(input) {
      logger.info('Creating hypothesis', { input });

      const hypothesis: Hypothesis = {
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: crypto.randomUUID(),
        status: 'Research',
      };

      const createdHypotheses = await db<Hypothesis>('hypothesis').insert(hypothesis).returning('*');

      if (!createdHypotheses) {
        throw new Error('Failed to create hypothesis');
      }

      return createdHypotheses[0];
    },

    async getHypotheses() {
      logger.info('Getting hypotheses');

      return await db<Hypothesis>('hypothesis').select('*');
    },
  }
}
