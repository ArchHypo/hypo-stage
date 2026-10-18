import { z } from 'zod';
import { QUALITY_ATTRIBUTES } from '../domain/archhypo';

export const ISSUE_CLASSIFICATIONS = ['bug', 'improvement', 'question', 'other'] as const;
export const EVIDENCE_TYPES = ['supports', 'contradicts', 'trigger_fired', 'unrelated'] as const;

// Same conventions as pipeline/schemas.ts: every key required, nullable instead of optional.
export const IssueTriageOutputSchema = z.object({
  classification: z.enum(ISSUE_CLASSIFICATIONS).describe('bug = defect; improvement = change request'),
  qualityAttributes: z
    .array(z.enum(QUALITY_ATTRIBUTES))
    .describe('Quality attributes the issue is about; empty when none clearly applies'),
  candidates: z
    .array(
      z.object({
        hypothesisId: z.string().describe('An id copied from the hypotheses list'),
        relevance: z.number().describe('0 = unrelated, 1 = the issue is clearly about this hypothesis'),
        reason: z.string(),
      }),
    )
    .describe('Hypotheses the issue may be evidence about. Usually empty.'),
});
export type IssueTriageOutput = z.infer<typeof IssueTriageOutputSchema>;

export const IssueAssessOutputSchema = z.object({
  related: z.boolean(),
  confidence: z.number().describe('0..1'),
  evidenceType: z
    .enum(EVIDENCE_TYPES)
    .describe(
      'supports: the report is consistent with the hypothesis; contradicts: the uncertainty seems to materialize against it; trigger_fired: the report meets the condition of one of its Trigger plannings; unrelated',
    ),
  triggerPlanningId: z
    .string()
    .nullable()
    .describe('Id of the Trigger planning whose condition the issue meets, when evidenceType is trigger_fired'),
  rationale: z.string().describe('Two or three sentences grounded in the issue text'),
});
export type IssueAssessOutput = z.infer<typeof IssueAssessOutputSchema>;
