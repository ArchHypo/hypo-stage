import { CLOSED_STATUSES } from '../domain/archhypo';
import { findCoverage, linkReviewToHypothesis } from '../store/reviews';
import { insertCoachSuggestion } from '../store/suggestions';
import { CoachDeps, reviewHypothesis } from './review';

function parseArray(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export interface FallbackResult {
  reviewed: number;
  linked: number;
  suggestions: number;
  failed: number;
}

/**
 * Reviews recent hypotheses that never went through the coach (e.g. created through the
 * API) and proposes a rewrite as a suggestion when the statement needs work.
 */
export async function runCoachFallback(deps: CoachDeps): Promise<FallbackResult> {
  const { knex, config, logger } = deps;
  const { maxPerRun, sinceDays } = config.coach.fallback;
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const result: FallbackResult = { reviewed: 0, linked: 0, suggestions: 0, failed: 0 };

  const candidates = await knex('hypothesis')
    .where('createdAt', '>=', since)
    .whereNotIn('status', CLOSED_STATUSES as string[])
    .whereNotExists(
      knex('agent_hypothesis_reviews')
        .select(knex.raw('1'))
        .whereRaw('agent_hypothesis_reviews.hypothesis_id = hypothesis.id')
        .andWhere('agent_hypothesis_reviews.status', 'completed'),
    )
    .orderBy('createdAt', 'asc')
    .limit(maxPerRun * 4);

  for (const h of candidates) {
    if (result.reviewed >= maxPerRun) {
      break;
    }
    const coverage = await findCoverage(knex, { id: h.id, statement: h.statement });
    if (coverage.covered) {
      if (coverage.unlinkedReviewId) {
        await linkReviewToHypothesis(knex, coverage.unlinkedReviewId, h.id);
        result.linked++;
      }
      continue;
    }
    if (coverage.exhausted) {
      continue;
    }

    const qualityAttributes = parseArray(h.qualityAttributes);
    try {
      result.reviewed++;
      const review = await reviewHypothesis(
        deps,
        {
          hypothesisId: h.id,
          statement: h.statement,
          sourceType: h.sourceType,
          qualityAttributes,
          entityRefs: parseArray(h.entityRefs),
          notes: h.notes,
        },
        'fallback',
        null,
      );
      if (review.verdict === 'needs_work' && review.rewrites.length > 0) {
        const warnings = review.issues.filter(i => i.severity === 'warning');
        await insertCoachSuggestion(knex, review.reviewId, {
          hypothesisId: h.id,
          technicalPlanningId: null,
          kind: 'rewrite',
          payload: {
            statement: review.rewrites[0].statement,
            previous: h.statement,
            sourceType: review.suggestedSourceType,
            addQualityAttributes: review.suggestedQualityAttributes,
            classification: review.classification,
          },
          rationale: [
            review.classificationReason,
            ...warnings.map(w => `${w.message} (${w.concept})`),
          ]
            .filter(Boolean)
            .join(' ')
            .slice(0, 1000),
          evidence: [],
          confidence: 1,
        });
        result.suggestions++;
      }
    } catch {
      // Recorded as a failed review; retried on later runs up to MAX_FAILED_ATTEMPTS.
      result.failed++;
    }
  }

  if (result.reviewed + result.linked > 0) {
    logger.info('Hypothesis coach fallback finished', { ...result });
  }
  return result;
}
