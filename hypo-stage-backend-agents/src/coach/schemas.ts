import { z } from 'zod';
import { QUALITY_ATTRIBUTES, SOURCE_TYPES } from '../domain/archhypo';

export const CLASSIFICATIONS = ['hypothesis', 'requirement', 'risk', 'decision', 'other'] as const;
export const ISSUE_TYPES = [
  'not_a_hypothesis',
  'not_falsifiable',
  'too_broad',
  'vague_terms',
  'solution_not_uncertainty',
  'other',
] as const;

// Same conventions as pipeline/schemas.ts: every key required, nullable instead of optional.
export const HypothesisReviewOutputSchema = z.object({
  classification: z
    .enum(CLASSIFICATIONS)
    .describe('What the statement actually is according to ArchHypo'),
  classificationReason: z.string().describe('One or two sentences explaining the classification'),
  falsifiable: z.boolean().describe('True if some evidence could prove the statement false'),
  refutingEvidence: z
    .string()
    .nullable()
    .describe('Concrete evidence that would refute the statement; null if none can be named'),
  issues: z
    .array(
      z.object({
        type: z.enum(ISSUE_TYPES),
        severity: z.enum(['info', 'warning']),
        message: z.string().describe('What is wrong with this statement, specifically'),
        concept: z.string().describe('The ArchHypo concept behind the issue, in one sentence'),
      }),
    )
    .describe('Problems found; empty when the statement is a good hypothesis'),
  rewrites: z
    .array(z.object({ statement: z.string(), reason: z.string() }))
    .describe('Up to two improved statements that keep the original intent'),
  splitInto: z
    .array(z.string())
    .describe('Only when the statement mixes several uncertainties: one statement per uncertainty'),
  suggestedSourceType: z.enum(SOURCE_TYPES).nullable(),
  suggestedQualityAttributes: z.array(z.enum(QUALITY_ATTRIBUTES)),
});
export type HypothesisReviewOutput = z.infer<typeof HypothesisReviewOutputSchema>;
