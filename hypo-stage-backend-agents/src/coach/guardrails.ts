import { QUALITY_ATTRIBUTES, SOURCE_TYPES } from '../domain/archhypo';
import { clampText } from '../pipeline/guardrails';
import type { CoachInput } from './prompts';
import type { HypothesisReviewOutput } from './schemas';

const MIN_STATEMENT = 20;
const MAX_STATEMENT = 500;
const MAX_REWRITES = 2;
const MAX_SPLIT = 3;
const MAX_ISSUES = 5;

export type ReviewVerdict = 'ok' | 'needs_work';

export interface HypothesisReview {
  verdict: ReviewVerdict;
  classification: HypothesisReviewOutput['classification'];
  classificationReason: string;
  falsifiable: boolean;
  refutingEvidence: string | null;
  issues: HypothesisReviewOutput['issues'];
  rewrites: HypothesisReviewOutput['rewrites'];
  splitInto: string[];
  suggestedSourceType: HypothesisReviewOutput['suggestedSourceType'];
  suggestedQualityAttributes: HypothesisReviewOutput['suggestedQualityAttributes'];
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const validStatement = (s: string) => {
  const length = s.trim().length;
  return length >= MIN_STATEMENT && length <= MAX_STATEMENT;
};

/** Keeps only output the form and the backend schemas can use, and computes the verdict. */
export function guardReview(input: CoachInput, output: HypothesisReviewOutput): HypothesisReview {
  const original = normalize(input.statement);

  const issues = (output.issues ?? []).slice(0, MAX_ISSUES).map(i => ({
    ...i,
    message: clampText(i.message, 300),
    concept: clampText(i.concept, 300),
  }));

  const seen = new Set<string>([original]);
  const rewrites = (output.rewrites ?? [])
    .map(r => ({ statement: r.statement.trim(), reason: clampText(r.reason, 300) }))
    .filter(r => {
      const key = normalize(r.statement);
      if (!validStatement(r.statement) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REWRITES);

  const tooBroad = issues.some(i => i.type === 'too_broad');
  const splitInto = tooBroad
    ? (output.splitInto ?? [])
        .map(s => s.trim())
        .filter(s => validStatement(s) && normalize(s) !== original)
        .slice(0, MAX_SPLIT)
    : [];

  const current = new Set(input.qualityAttributes ?? []);
  const suggestedQualityAttributes = Array.from(
    new Set(
      (output.suggestedQualityAttributes ?? []).filter(
        qa => (QUALITY_ATTRIBUTES as readonly string[]).includes(qa) && !current.has(qa),
      ),
    ),
  );

  const suggestedSourceType =
    output.suggestedSourceType &&
    (SOURCE_TYPES as readonly string[]).includes(output.suggestedSourceType) &&
    output.suggestedSourceType !== input.sourceType
      ? output.suggestedSourceType
      : null;

  const verdict: ReviewVerdict =
    output.classification === 'hypothesis' && !issues.some(i => i.severity === 'warning')
      ? 'ok'
      : 'needs_work';

  return {
    verdict,
    classification: output.classification,
    classificationReason: clampText(output.classificationReason ?? '', 500),
    falsifiable: Boolean(output.falsifiable),
    refutingEvidence: output.refutingEvidence ? clampText(output.refutingEvidence, 500) : null,
    issues,
    rewrites,
    splitInto,
    suggestedSourceType,
    suggestedQualityAttributes,
  };
}
