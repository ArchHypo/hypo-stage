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
  entityRefs: z.array(z.string()), // Backstage entity reference pattern
  status: statusSchema,
  sourceType: sourceTypeSchema,
  relatedArtefacts: z.array(z.string().url()),
  qualityAttributes: z.array(qualityAttributeSchema),
  uncertainty: likertScaleSchema,
  impact: likertScaleSchema,
  notes: z.string().nullable(),
});

/** ISO date string YYYY-MM-DD; rejects invalid calendar dates and unreasonable years (e.g. typos like 20026). */
const isoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Target date must be YYYY-MM-DD (e.g. 2026-02-07)' })
  .refine(
    (s) => {
      const [y, m, d] = s.split('-').map(Number);
      const year = y;
      const month = m - 1;
      const date = new Date(year, month, d);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === d &&
        year >= 2000 &&
        year <= 2100
      );
    },
    { message: 'Target date must be a valid calendar date between 2000 and 2100' }
  );

export const createTechnicalPlanningSchema = z.object({
  entityRef: z.string(), // Backstage entity reference pattern
  actionType: actionTypeSchema,
  description: z.string().min(1).max(500),
  expectedOutcome: z.string().min(1).max(500),
  documentations: z.array(z.string().url()),
  targetDate: isoDateStringSchema,
});

export const updateTechnicalPlanningSchema = z.object({
  expectedOutcome: z.string().min(1).max(500),
  documentations: z.array(z.string().url()),
});
