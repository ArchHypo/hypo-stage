import { DatabaseService, LoggerService } from "@backstage/backend-plugin-api";
import { CreateHypothesisInput, Hypothesis, HypothesisService, UpdateHypothesisInput, HypothesisEvent, TechnicalPlanning, CreateTechnicalPlanningInput, UpdateTechnicalPlanningInput } from "../types/hypothesis";

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
          entityRefs: JSON.stringify(input.entityRefs),
          relatedArtefacts: JSON.stringify(input.relatedArtefacts),
          qualityAttributes: JSON.stringify(input.qualityAttributes),
        }).returning('*');

        if (!createdHypotheses || createdHypotheses.length === 0) {
          throw new Error('Failed to create hypothesis');
        }

        const createdHypothesis = createdHypotheses[0];

        // Parse entityRefs, relatedArtefacts, qualityAttributes
        createdHypothesis.entityRefs = JSON.parse(createdHypothesis.entityRefs);
        createdHypothesis.relatedArtefacts = JSON.parse(createdHypothesis.relatedArtefacts);
        createdHypothesis.qualityAttributes = JSON.parse(createdHypothesis.qualityAttributes);

        // Get technical plannings for this hypothesis
        const technicalPlannings = await trx('technicalPlanning')
          .where('hypothesisId', createdHypothesis.id)
          .select('*');

        createdHypothesis.technicalPlannings = technicalPlannings.map(tp => ({
          ...tp,
          documentations: JSON.parse(tp.documentations),
        }));

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

      const hypotheses = await db('hypothesis').select('*');

      // Parse entityRefs, relatedArtefacts, qualityAttributes and get technical plannings
      const hypothesesWithTechPlans = await Promise.all(
        hypotheses.map(async (hypothesis) => {
          const technicalPlannings = await db('technicalPlanning')
            .where('hypothesisId', hypothesis.id)
            .select('*');

          return {
            ...hypothesis,
            entityRefs: JSON.parse(hypothesis.entityRefs),
            relatedArtefacts: JSON.parse(hypothesis.relatedArtefacts),
            qualityAttributes: JSON.parse(hypothesis.qualityAttributes),
            technicalPlannings: technicalPlannings.map(tp => ({
              ...tp,
              documentations: JSON.parse(tp.documentations),
            })),
          };
        })
      );

      return hypothesesWithTechPlans;
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
          })
          .returning('*');

        if (!updatedHypotheses || updatedHypotheses.length === 0) {
          throw new Error('Failed to update hypothesis');
        }

        const updatedHypothesis = updatedHypotheses[0];

        // Parse entityRefs, relatedArtefacts, qualityAttributes
        updatedHypothesis.entityRefs = JSON.parse(updatedHypothesis.entityRefs);
        updatedHypothesis.relatedArtefacts = JSON.parse(updatedHypothesis.relatedArtefacts);
        updatedHypothesis.qualityAttributes = JSON.parse(updatedHypothesis.qualityAttributes);

        // Get technical plannings for this hypothesis
        const technicalPlannings = await trx('technicalPlanning')
          .where('hypothesisId', id)
          .select('*');

        updatedHypothesis.technicalPlannings = technicalPlannings.map(tp => ({
          ...tp,
          documentations: JSON.parse(tp.documentations),
        }));

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

  async createTechnicalPlanning(hypothesisId: string, input: CreateTechnicalPlanningInput): Promise<TechnicalPlanning> {
    logger.info('Creating technical planning', { hypothesisId, input });

    return await db.transaction(async (trx) => {
      // Create the technical planning
      const createdTechPlans = await trx('technicalPlanning').insert({
        hypothesisId,
        ...input,
        documentations: JSON.stringify(input.documentations),
        targetDate: new Date(input.targetDate),
      }).returning('*');

      if (!createdTechPlans || createdTechPlans.length === 0) {
        throw new Error('Failed to create technical planning');
      }

      const createdTechPlan = createdTechPlans[0];

      // Parse documentations
      createdTechPlan.documentations = JSON.parse(createdTechPlan.documentations);

      return createdTechPlan;
    });
  },

  async updateTechnicalPlanning(id: string, input: UpdateTechnicalPlanningInput): Promise<TechnicalPlanning> {
    logger.info('Updating technical planning', { id, input });

    return await db.transaction(async (trx) => {
      // Update the technical planning
      const updatedTechPlans = await trx('technicalPlanning')
        .where('id', id)
        .update({
          updatedAt: new Date(),
          ...input,
          documentations: JSON.stringify(input.documentations),
        })
        .returning('*');

      if (!updatedTechPlans || updatedTechPlans.length === 0) {
        throw new Error('Failed to update technical planning');
      }

      const updatedTechPlan = updatedTechPlans[0];

      // Parse documentations
      updatedTechPlan.documentations = JSON.parse(updatedTechPlan.documentations);

      return updatedTechPlan;
    });
  },

  async deleteTechnicalPlanning(id: string): Promise<void> {
    logger.info('Deleting technical planning', { id });

    const deletedCount = await db('technicalPlanning')
      .where('id', id)
      .del();

    if (deletedCount === 0) {
      throw new Error('Technical planning not found');
    }
  },
  };
}
