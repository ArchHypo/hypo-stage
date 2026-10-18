import type { Knex } from 'knex';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { AgentsConfig, findModel } from '../config';
import { loadHypotheses } from '../pipeline/context';
import { generateStructured } from '../pipeline/llm';
import type { ModelRegistry } from '../providers/models';
import type { RunTraceStep } from '../store/runs';
import { insertPlanProposal } from '../store/plans';
import { GuardedPlan, guardPlan } from './guardrails';
import { buildPlannerPrompt, ComponentInfo, PLANNER_SYSTEM_PROMPT } from './prompts';
import { PlanProposalOutputSchema } from './schemas';
import { StrategyProfileName, strategyProfile } from './strategy';

export const PLANNER_TIMEOUT_MS = 45_000;

export interface PlannerDeps {
  knex: Knex;
  logger: LoggerService;
  config: AgentsConfig;
  models: ModelRegistry;
  /** Catalog description/system for entity refs; failures are tolerated. */
  describeComponents?: (entityRefs: string[]) => Promise<ComponentInfo[]>;
}

export interface PlanProposal extends GuardedPlan {
  proposalId: string;
  hypothesisId: string;
  profile: StrategyProfileName;
}

export class HypothesisNotFoundError extends Error {}
export class HypothesisWithoutComponentsError extends Error {}
export class PlannerTimeoutError extends Error {}

export async function designPlan(
  deps: PlannerDeps,
  hypothesisId: string,
  requestedBy: string | null,
): Promise<PlanProposal> {
  const { knex, config, logger } = deps;
  const [hypothesis] = await loadHypotheses(knex, { ids: [hypothesisId] });
  if (!hypothesis) {
    throw new HypothesisNotFoundError(`Hypothesis ${hypothesisId} not found`);
  }
  if (hypothesis.entityRefs.length === 0) {
    throw new HypothesisWithoutComponentsError('The hypothesis has no entity references');
  }

  const modelDef = findModel(config, config.planner.model!);
  const profile = strategyProfile(hypothesis.uncertainty, hypothesis.impact);
  const components = deps.describeComponents
    ? await deps.describeComponents(hypothesis.entityRefs).catch(() => [])
    : [];
  const trace: RunTraceStep[] = [];
  const started = Date.now();
  const base = {
    hypothesisId,
    requestedBy,
    modelKey: modelDef.key,
    provider: modelDef.provider,
    profile: profile.profile,
  };

  try {
    const output = await generateStructured({
      model: deps.models.resolve(modelDef),
      schema: PlanProposalOutputSchema,
      system: PLANNER_SYSTEM_PROMPT,
      prompt: buildPlannerPrompt(hypothesis, profile, components),
      step: 'planner',
      trace,
      timeoutMs: PLANNER_TIMEOUT_MS,
      maxRetries: 0,
    });
    const plan = guardPlan(hypothesis, output, profile, {
      maxActions: config.planner.maxActions,
      iterationDays: config.planner.iterationDays,
    });
    const proposalId = await insertPlanProposal(knex, {
      ...base,
      status: 'completed',
      result: plan,
      durationMs: Date.now() - started,
      inputTokens: trace[0]?.inputTokens,
      outputTokens: trace[0]?.outputTokens,
    });
    return { proposalId, hypothesisId, profile: profile.profile, ...plan };
  } catch (error) {
    const { name, message: rawMessage } = (error ?? {}) as { name?: string; message?: string };
    const message = rawMessage ?? String(error);
    const timedOut =
      name === 'TimeoutError' || name === 'AbortError' || /aborted|timeout/i.test(message);
    await insertPlanProposal(knex, {
      ...base,
      status: 'failed',
      error: timedOut ? `timed out after ${PLANNER_TIMEOUT_MS} ms` : message,
      durationMs: Date.now() - started,
    });
    logger.warn('Technical plan designer failed', { hypothesisId, error: message });
    throw timedOut ? new PlannerTimeoutError(message) : error;
  }
}
