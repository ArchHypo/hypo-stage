import { DatabaseService, LoggerService } from "@backstage/backend-plugin-api";
import { Hypothesis, HypothesisService } from "../types/hypothesis";
import { NotFoundError } from "@backstage/errors";

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
        createdAt: new Date(),
        updatedAt: new Date(),
        id: crypto.randomUUID(),
        ...input,
        status: 'Research',
        owner: 'unknown', // TODO associate with backstage entities
      };

      await db<Hypothesis>('hypothesis').insert(hypothesis);

      return hypothesis;
    },

    async getHypotheses() {
      logger.info('Getting hypotheses');

      return await db<Hypothesis>('hypothesis').select('*');
    },

    async getHypothesis(id: string) {
      logger.info('Getting hypothesis', { id });

      const hypothesis = await db<Hypothesis>('hypothesis').where('id', id).first();

      if (!hypothesis) {
        throw new NotFoundError(`Hypothesis with id ${id} not found`);
      }

      return hypothesis;
    },
  }
}
