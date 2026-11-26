import { z } from 'zod';
import { ACTION_TYPES, LIKERT_SCALE } from '../domain/archhypo';
import { PLAN_GOALS } from './strategy';

const likert = z.enum(LIKERT_SCALE);

// Same conventions as pipeline/schemas.ts: every key required, nullable instead of optional.
export const PlanProposalOutputSchema = z.object({
  reading: z
    .string()
    .describe('Two or three sentences: how the assessment is read and the strategy chosen'),
  actions: z
    .array(
      z.object({
        actionType: z.enum(ACTION_TYPES),
        goal: z.enum(PLAN_GOALS),
        description: z.string().describe('What the team will do, specific to this hypothesis'),
        evidence: z
          .string()
          .describe('Observable, measurable result (with a threshold when possible) and which level it moves'),
        expectedEffect: z.object({
          uncertainty: likert.nullable().describe('Uncertainty after the action succeeds; null if unchanged'),
          impact: likert.nullable().describe('Impact after the action succeeds; null if unchanged'),
        }),
        iteration: z.number().describe('Iteration in which to do it: 1 = the next iteration'),
        entityRef: z.string().nullable().describe('One of the hypothesis components'),
        rationale: z.string().describe('Why this action fits the strategy'),
      }),
    )
    .describe('Two to four complementary actions'),
});
export type PlanProposalOutput = z.infer<typeof PlanProposalOutputSchema>;
