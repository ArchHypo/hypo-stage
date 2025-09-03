import { z } from "zod";

export const statusSchema = z.enum([
  'Open',
  'In Review',
  'Validated',
  'Discarded',
  'Trigger-Fired',
  'Other'
]);

export const sourceTypeSchema = z.enum([
  'Requirements',
  'Solution',
  'Quality Attribute',
  'Other'
]);

export const qualityAttributeSchema = z.enum([
  'Performance',
  'Reliability',
  'Availability',
  'Scalability',
  'Security',
  'Maintainability',
  'Modifiability',
  'Usability',
  'Testability',
  'Deployability',
  'Configurability',
  'Recoverability',
  'Flexibility',
  'Interoperability',
  'Reusability',
  'Extensibility',
  'Observability',
  'Auditability'
]);

export const likertScaleSchema = z.enum([
  'Very Low',
  'Low',
  'Medium',
  'High',
  'Very High'
]);

export const actionTypeSchema = z.enum([
  'Experiment',
  'Analytics',
  'Spike',
  'Tracer Bullet',
  'Modularization',
  'Trigger',
  'Guideline',
  'Other'
]);

export const createHypothesisSchema = z.object({
  entityRefs: z.array(z.string()), // Backstage entity reference pattern
  statement: z.string().min(20).max(500),
  sourceType: sourceTypeSchema,
  relatedArtefacts: z.array(z.string().url()),
  qualityAttributes: z.array(qualityAttributeSchema),
  uncertainty: likertScaleSchema,
  impact: likertScaleSchema,
  notes: z.string().nullable(),
});

export const updateHypothesisSchema = z.object({
  status: statusSchema,
  sourceType: sourceTypeSchema,
  relatedArtefacts: z.array(z.string().url()),
  qualityAttributes: z.array(qualityAttributeSchema),
  uncertainty: likertScaleSchema,
  impact: likertScaleSchema,
  notes: z.string().nullable(),
});

export const createTechnicalPlanningSchema = z.object({
  entityRef: z.string(), // Backstage entity reference pattern
  actionType: actionTypeSchema,
  description: z.string().min(1).max(500),
  expectedOutcome: z.string().min(1).max(500),
  documentations: z.array(z.string().url()),
  targetDate: z.string().date(),
});

export const updateTechnicalPlanningSchema = z.object({
  expectedOutcome: z.string().min(1).max(500),
  documentations: z.array(z.string().url()),
});
