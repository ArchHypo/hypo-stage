import { z } from 'zod';
import { ACTION_TYPES, HYPOTHESIS_STATUSES, LIKERT_SCALE } from '../domain/archhypo';

// Every key is required and uses .nullable() instead of .optional(), which keeps the
// schemas valid for OpenAI strict structured outputs and easy for small local models.

export const TriageOutputSchema = z.object({
  candidates: z
    .array(
      z.object({
        hypothesisId: z.string().describe('An id copied from the hypotheses list'),
        relevance: z.number().describe('0 = unrelated, 1 = the PR clearly works on this hypothesis'),
        reason: z.string().describe('One sentence explaining the relation'),
      }),
    )
    .describe('Hypotheses this PR may affect. Empty when none.'),
});
export type TriageOutput = z.infer<typeof TriageOutputSchema>;

const likert = z.enum(LIKERT_SCALE);

export const AssessmentOutputSchema = z.object({
  related: z.boolean().describe('True only if the PR changes something this hypothesis is about'),
  confidence: z.number().describe('0..1 confidence in this assessment'),
  rationale: z.string().describe('Two or three sentences grounded in the diff'),
  evidence: z
    .array(z.object({ file: z.string(), note: z.string() }))
    .describe('Changed files that support the rationale'),
  reassessment: z
    .object({
      uncertainty: likert.nullable().describe('New uncertainty level, null to keep current'),
      impact: likert.nullable().describe('New impact level, null to keep current'),
      reason: z.string(),
    })
    .nullable()
    .describe('Only when the PR brings information that changes uncertainty or impact'),
  planningProgress: z
    .array(
      z.object({
        technicalPlanningId: z.string().describe('An id copied from this hypothesis technical plannings'),
        effect: z.enum(['advances', 'completes']),
        expectedOutcomeUpdate: z
          .string()
          .nullable()
          .describe('Updated expected outcome text, null to keep current'),
        reason: z.string(),
      }),
    )
    .describe('Existing technical plannings that this PR executes'),
  newPlanning: z
    .object({
      actionType: z.enum(ACTION_TYPES),
      entityRef: z.string().nullable(),
      description: z.string(),
      expectedOutcome: z.string(),
      targetDate: z.string().nullable().describe('YYYY-MM-DD'),
      reason: z.string(),
    })
    .nullable()
    .describe('A new action worth planning because no existing plan covers what the PR touches'),
  statusChange: z
    .object({
      status: z.enum(HYPOTHESIS_STATUSES),
      reason: z.string(),
    })
    .nullable()
    .describe('Only when the PR resolves the uncertainty or fires a trigger'),
});
export type AssessmentOutput = z.infer<typeof AssessmentOutputSchema>;
