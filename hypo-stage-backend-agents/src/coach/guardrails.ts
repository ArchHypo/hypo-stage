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
  /** Rewrites and splits that were not kept, with the reason. */
  dropped: string[];
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
  const dropped: string[] = [];
  const rewrites: HypothesisReviewOutput['rewrites'] = [];
  for (const raw of output.rewrites ?? []) {
    const statement = raw.statement.trim();
    const key = normalize(statement);
    if (!validStatement(statement)) {
      dropped.push('rewrite is shorter than 20 or longer than 500 characters');
      continue;
    }
    if (seen.has(key)) {
      dropped.push('rewrite repeats the statement or an earlier rewrite');
      continue;
    }
    if (rewrites.length >= MAX_REWRITES) {
      dropped.push(`stopped after ${MAX_REWRITES} rewrites`);
      continue;
    }
    seen.add(key);
    rewrites.push({ statement, reason: clampText(raw.reason, 300) });
  }

  const tooBroad = issues.some(i => i.type === 'too_broad');
  const splitInto: string[] = [];
  for (const raw of output.splitInto ?? []) {
    const statement = raw.trim();
    if (!tooBroad) {
      dropped.push('split was ignored because the statement is not too broad');
      continue;
    }
    if (!validStatement(statement) || normalize(statement) === original) {
      dropped.push('split part is empty, too short, or repeats the statement');
      continue;
    }
    if (splitInto.length >= MAX_SPLIT) {
      dropped.push(`stopped after ${MAX_SPLIT} split parts`);
      continue;
    }
    splitInto.push(statement);
  }

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
    dropped,
  };
}
