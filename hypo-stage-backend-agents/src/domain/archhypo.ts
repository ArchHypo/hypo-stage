/**
 * ArchHypo vocabulary. Mirrors the zod enums in
 * hypo-stage-backend/src/schemas/hypothesis.ts (kept in sync by archhypo.test.ts),
 * so suggestions can be applied through that plugin's API without failing validation.
 */
export const LIKERT_SCALE = ['Very Low', 'Low', 'Medium', 'High', 'Very High'] as const;

export const HYPOTHESIS_STATUSES = [
  'Open',
  'In Review',
  'Validated',
  'Discarded',
  'Trigger-Fired',
  'Other',
] as const;

export const ACTION_TYPES = [
  'Experiment',
  'Analytics',
  'Spike',
  'Tracer Bullet',
  'Modularization',
  'Trigger',
  'Guideline',
  'Other',
] as const;

export const SOURCE_TYPES = ['Requirements', 'Solution', 'Quality Attribute', 'Other'] as const;

export const QUALITY_ATTRIBUTES = [
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
  'Auditability',
] as const;

export type LikertScale = (typeof LIKERT_SCALE)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type QualityAttribute = (typeof QUALITY_ATTRIBUTES)[number];
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];

/** Statuses where the uncertainty is considered resolved; such hypotheses are not analyzed. */
export const CLOSED_STATUSES: readonly string[] = ['Validated', 'Discarded'];

/** Max length for free-text fields accepted by the backend schemas. */
export const MAX_TEXT_LENGTH = 500;

export interface TechnicalPlanningRecord {
  id: string;
  hypothesisId: string;
  entityRef: string;
  actionType: string;
  description: string;
  expectedOutcome: string;
  documentations: string[];
  targetDate: string | null;
}

export interface HypothesisEventRecord {
  timestamp: string;
  eventType: string;
  technicalPlanningId: string | null;
  uncertainty: string | null;
  impact: string | null;
}

export interface HypothesisRecord {
  id: string;
  statement: string;
  status: string;
  sourceType: string;
  uncertainty: string;
  impact: string;
  entityRefs: string[];
  qualityAttributes: string[];
  relatedArtefacts: string[];
  notes: string | null;
  technicalPlannings: TechnicalPlanningRecord[];
  recentEvents: HypothesisEventRecord[];
}
