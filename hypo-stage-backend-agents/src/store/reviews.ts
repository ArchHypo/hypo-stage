import crypto from 'crypto';
import type { Knex } from 'knex';

export type ReviewTrigger = 'on_demand' | 'save' | 'fallback';

/** Hash of the statement ignoring case and whitespace differences. */
export function statementHash(statement: string): string {
  const normalized = statement.trim().replace(/\s+/g, ' ').toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function insertReview(
  knex: Knex,
  review: {
    hypothesisId: string | null;
    statement: string;
    trigger: ReviewTrigger;
    requestedBy: string | null;
    modelKey: string;
    provider: string;
    status: 'completed' | 'failed';
    error?: string;
    result?: unknown;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await knex('agent_hypothesis_reviews').insert({
    id,
    hypothesis_id: review.hypothesisId,
    statement_hash: statementHash(review.statement),
    statement: review.statement,
    trigger: review.trigger,
    requested_by: review.requestedBy,
    model_key: review.modelKey,
    provider: review.provider,
    status: review.status,
    error: review.error ?? null,
    result: review.result === undefined ? null : JSON.stringify(review.result),
    duration_ms: review.durationMs,
    input_tokens: review.inputTokens ?? null,
    output_tokens: review.outputTokens ?? null,
  });
  return id;
}

export const MAX_FAILED_ATTEMPTS = 3;

/**
 * Whether a hypothesis already went through the coach: a completed review linked to it,
 * or a completed review of its current statement (e.g. a draft reviewed in the form before
 * the hypothesis existed), which is returned so it can be linked. `exhausted` is true once
 * the coach failed MAX_FAILED_ATTEMPTS times for it, so the fallback stops retrying.
 */
export async function findCoverage(
  knex: Knex,
  hypothesis: { id: string; statement: string },
): Promise<{ covered: boolean; unlinkedReviewId: string | null; exhausted: boolean }> {
  const linked = await knex('agent_hypothesis_reviews')
    .where({ hypothesis_id: hypothesis.id, status: 'completed' })
    .first('id');
  if (linked) {
    return { covered: true, unlinkedReviewId: null, exhausted: false };
  }
  const byHash = await knex('agent_hypothesis_reviews')
    .where({ statement_hash: statementHash(hypothesis.statement), status: 'completed' })
    .whereNull('hypothesis_id')
    .orderBy('createdAt', 'desc')
    .first('id');
  if (byHash) {
    return { covered: true, unlinkedReviewId: byHash.id, exhausted: false };
  }
  const [{ failures }] = await knex('agent_hypothesis_reviews')
    .where({ hypothesis_id: hypothesis.id, status: 'failed' })
    .count({ failures: '*' });
  return {
    covered: false,
    unlinkedReviewId: null,
    exhausted: Number(failures) >= MAX_FAILED_ATTEMPTS,
  };
}

export async function linkReviewToHypothesis(
  knex: Knex,
  reviewId: string,
  hypothesisId: string,
): Promise<void> {
  await knex('agent_hypothesis_reviews').where('id', reviewId).update({ hypothesis_id: hypothesisId });
}
