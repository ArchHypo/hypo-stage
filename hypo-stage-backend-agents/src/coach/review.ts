import type { Knex } from 'knex';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { AgentsConfig, findModel } from '../config';
import type { ModelRegistry } from '../providers/models';
import { generateStructured } from '../pipeline/llm';
import type { RunTraceStep } from '../store/runs';
import { insertReview, ReviewTrigger } from '../store/reviews';
import { guardReview, HypothesisReview } from './guardrails';
import { buildCoachPrompt, COACH_SYSTEM_PROMPT, CoachInput } from './prompts';
import { HypothesisReviewOutputSchema } from './schemas';

export const COACH_TIMEOUT_MS = 20_000;

export interface CoachDeps {
  knex: Knex;
  logger: LoggerService;
  config: AgentsConfig;
  models: ModelRegistry;
}

export interface StoredReview extends HypothesisReview {
  reviewId: string;
}

export class CoachTimeoutError extends Error {}

/**
 * Reviews one statement with the coach model, stores the review (completed or failed)
 * and returns the guarded result. Throws on failure after recording it.
 */
export async function reviewHypothesis(
  deps: CoachDeps,
  input: CoachInput & { hypothesisId?: string | null },
  trigger: ReviewTrigger,
  requestedBy: string | null,
): Promise<StoredReview> {
  const { knex, config } = deps;
  if (!config.coach.model) {
    throw new Error('Hypothesis coach has no model configured');
  }
  const modelDef = findModel(config, config.coach.model);
  const trace: RunTraceStep[] = [];
  const started = Date.now();
  const base = {
    hypothesisId: input.hypothesisId ?? null,
    statement: input.statement.trim(),
    trigger,
    requestedBy,
    modelKey: modelDef.key,
    provider: modelDef.provider,
  };

  try {
    const output = await generateStructured({
      model: deps.models.resolve(modelDef),
      schema: HypothesisReviewOutputSchema,
      system: COACH_SYSTEM_PROMPT,
      prompt: buildCoachPrompt(input),
      step: 'coach',
      trace,
      timeoutMs: COACH_TIMEOUT_MS,
      maxRetries: trigger === 'fallback' ? 2 : 0,
    });
    const review = guardReview(input, output);
    const reviewId = await insertReview(knex, {
      ...base,
      status: 'completed',
      result: review,
      durationMs: Date.now() - started,
      inputTokens: trace[0]?.inputTokens,
      outputTokens: trace[0]?.outputTokens,
    });
    return { reviewId, ...review };
  } catch (error) {
    // AbortSignal.timeout rejects with a DOMException, which is not always an Error instance.
    const { name, message: rawMessage } = (error ?? {}) as { name?: string; message?: string };
    const message = rawMessage ?? String(error);
    const timedOut =
      name === 'TimeoutError' || name === 'AbortError' || /aborted|timeout/i.test(message);
    await insertReview(knex, {
      ...base,
      status: 'failed',
      error: timedOut ? `timed out after ${COACH_TIMEOUT_MS} ms` : message,
      durationMs: Date.now() - started,
    });
    deps.logger.warn('Hypothesis coach review failed', { trigger, error: message });
    throw timedOut ? new CoachTimeoutError(message) : error;
  }
}
