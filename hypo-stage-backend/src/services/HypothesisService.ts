import { DatabaseService, LoggerService } from "@backstage/backend-plugin-api";
import { CreateHypothesisInput, Hypothesis, HypothesisService, UpdateHypothesisInput, HypothesisEvent } from "../types/hypothesis";

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
    async create(input: CreateHypothesisInput): Promise<Hypothesis> {
      logger.info('Creating hypothesis', { input });

      // Use transaction to ensure consistency between hypothesis creation and event logging
      return await db.transaction(async (trx) => {
        // Create the hypothesis
        const createdHypotheses = await trx('hypothesis').insert({
          status: 'Open',
          ...input,
          relatedArtefacts: JSON.stringify(input.relatedArtefacts),
          qualityAttributes: JSON.stringify(input.qualityAttributes),
          technicalPlanning: JSON.stringify(input.technicalPlanning),
        }).returning('*');

        if (!createdHypotheses || createdHypotheses.length === 0) {
          throw new Error('Failed to create hypothesis');
        }

        const createdHypothesis = createdHypotheses[0];

        // Parse relatedArtefacts, qualityAttributes, technicalPlanning
        createdHypothesis.relatedArtefacts = JSON.parse(createdHypothesis.relatedArtefacts);
        createdHypothesis.qualityAttributes = JSON.parse(createdHypothesis.qualityAttributes);
        createdHypothesis.technicalPlanning = JSON.parse(createdHypothesis.technicalPlanning);

        // Create the change event
        await trx('hypothesisEvents').insert({
          hypothesisId: createdHypothesis.id,
          eventType: 'CREATE',
          changes: JSON.stringify(input),
        });

        return createdHypothesis;
      });
    },

    async getAll(): Promise<Hypothesis[]> {
      logger.info('Getting hypotheses');

      const hypotheses = await db('hypothesis').select('*')

      // Parse relatedArtefacts, qualityAttributes, technicalPlanning
      return hypotheses.map(hypothesis => ({
        ...hypothesis,
        relatedArtefacts: JSON.parse(hypothesis.relatedArtefacts),
        qualityAttributes: JSON.parse(hypothesis.qualityAttributes),
        technicalPlanning: JSON.parse(hypothesis.technicalPlanning),
      }));
    },

    async update(id: string, input: UpdateHypothesisInput): Promise<Hypothesis> {
      logger.info('Updating hypothesis', { id, input });

      // Use transaction to ensure consistency between hypothesis update and event logging
      return await db.transaction(async (trx) => {
        // Update the hypothesis
        const updatedHypotheses = await trx('hypothesis')
          .where('id', id)
          .update({
            updatedAt: new Date(),
            ...input,
            relatedArtefacts: JSON.stringify(input.relatedArtefacts),
            qualityAttributes: JSON.stringify(input.qualityAttributes),
            technicalPlanning: JSON.stringify(input.technicalPlanning),
          })
          .returning('*');

        if (!updatedHypotheses || updatedHypotheses.length === 0) {
          throw new Error('Failed to update hypothesis');
        }

        const updatedHypothesis = updatedHypotheses[0];

        // Parse relatedArtefacts, qualityAttributes, technicalPlanning
        updatedHypothesis.relatedArtefacts = JSON.parse(updatedHypothesis.relatedArtefacts);
        updatedHypothesis.qualityAttributes = JSON.parse(updatedHypothesis.qualityAttributes);
        updatedHypothesis.technicalPlanning = JSON.parse(updatedHypothesis.technicalPlanning);

        // Create the change event
        await trx('hypothesisEvents').insert({
          hypothesisId: id,
          eventType: 'UPDATE',
          changes: JSON.stringify(input),
        });

        return updatedHypothesis;
      });
    },

  async getEvents(id: string): Promise<HypothesisEvent[]> {
    logger.info('Getting hypothesis events', { id });

    const events = await db('hypothesisEvents')
      .where('hypothesisId', id)
      .orderBy('timestamp', 'asc')
      .select('*');

    // Parse changes
    return events.map(event => ({
      ...event,
      changes: JSON.parse(event.changes),
    }));
  },
  };
}
