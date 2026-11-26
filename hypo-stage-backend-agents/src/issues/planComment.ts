import { z } from 'zod';
import { findModel, findRepository } from '../config';
import { LIKERT_SCALE } from '../domain/archhypo';
import type { IssueEvent } from '../github/events';
import { applyGuardrails } from '../pipeline/guardrails';
import { loadHypotheses } from '../pipeline/context';
import { generateStructured } from '../pipeline/llm';
import type { PipelineDeps } from '../pipeline/run';
import { toIssueRef } from '../store/issues';
import { finishRun, RunTrace, startRun } from '../store/runs';
import { completedPlanningIds, upsertPendingSuggestion } from '../store/suggestions';
import type { IssueHandlerResult } from './triage';

const CommentSchema = z.object({
  related: z.boolean(),
  confidence: z.number(),
  rationale: z.string(),
  progress: z
    .object({
      effect: z.enum(['advances', 'completes']),
      expectedOutcomeUpdate: z.string().nullable(),
      reason: z.string(),
    })
    .nullable(),
  reassessment: z
    .object({
      uncertainty: z.enum(LIKERT_SCALE).nullable(),
      impact: z.enum(LIKERT_SCALE).nullable(),
      reason: z.string(),
    })
    .nullable(),
});

const COMMENT_SYSTEM = `You assess one human comment on a technical-planning issue.
Compare the comment only to that planning's expected outcome, which starts with "Goal:" and "Evidence:".
You may report progress on that planning, a reassessment of uncertainty or impact, or both.
Do not propose a new planning, a link, or a status change.`;

/**
 * A human comment on a plan issue is assessed against that planning's Goal and Evidence.
 * The model may propose progress or a reassessment for that planning only.
 */
export async function runPlanComment(
  deps: PipelineDeps,
  event: IssueEvent,
  planningId: string,
): Promise<IssueHandlerResult> {
  const { knex, config, logger } = deps;
  const planningRow = await knex('technicalPlanning').where('id', planningId).first('hypothesisId', 'expectedOutcome');
  if (!planningRow) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const [hypothesis] = await loadHypotheses(knex, { ids: [planningRow.hypothesisId] });
  const repo = findRepository(config, event.repository);
  const modelKey = repo?.model ?? config.planner.model ?? config.defaultModel;
  if (!hypothesis || !modelKey) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const modelDef = findModel(config, modelKey);
  const runId = await startRun(knex, {
    repository: event.repository,
    prNumber: event.number,
    headSha: null,
    prUrl: event.url,
    triggerAction: `${event.event}.${event.action}`,
    modelKey: modelDef.key,
    provider: modelDef.provider,
    artifactKind: 'issue',
    handler: 'plan_comment',
    origin: 'hypostage',
  });
  const trace: RunTrace = { steps: [] };

  try {
    const issue = await deps.github.getIssue(event.repository, event.number);
    const comments = issue.commentThread
      .filter(comment => comment.body.trim())
      .map(comment => `- ${comment.author ?? 'someone'}: ${comment.body}`)
      .join('\n');
    const output = await generateStructured({
      model: deps.models.resolve(modelDef),
      schema: CommentSchema,
      system: COMMENT_SYSTEM,
      prompt: [
        `Planning expected outcome: ${planningRow.expectedOutcome}`,
        `Hypothesis uncertainty: ${hypothesis.uncertainty}. Impact: ${hypothesis.impact}.`,
        'Comments:',
        comments || '(none)',
      ].join('\n'),
      step: 'plan_comment',
      trace: trace.steps,
      details: { planningId },
    });
    const { suggestions, dropped } = applyGuardrails({
      hypothesis,
      assessment: {
        related: output.related,
        confidence: output.confidence,
        rationale: output.rationale,
        evidence: [],
        reassessment: output.reassessment,
        planningProgress: output.progress
          ? [{ technicalPlanningId: planningId, ...output.progress }]
          : [],
        newPlanning: null,
        statusChange: null,
      },
      prUrl: issue.url,
      prMerged: issue.state === 'closed' && issue.stateReason === 'completed',
      changedFiles: [],
      confidenceThreshold: repo?.confidenceThreshold ?? config.confidenceThreshold,
      allowedKinds: ['planning_progress', 'reassessment'],
      completedPlanningIds: await completedPlanningIds(knex, [planningId]),
    });
    const step = trace.steps[trace.steps.length - 1];
    if (step) {
      step.details = { ...step.details, kept: suggestions.map(s => s.kind), dropped };
    }
    const source = { artifactRef: toIssueRef(event.repository, event.number), url: issue.url, kind: 'issue' as const };
    for (const suggestion of suggestions) {
      await upsertPendingSuggestion(knex, { runId, source }, suggestion);
    }
    trace.suggestions = suggestions.length;
    await finishRun(knex, runId, { status: 'completed', trace });
    logger.info('Plan issue comment assessed', { number: event.number, suggestions: suggestions.length });
    return { runId, status: 'completed', suggestions: suggestions.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    throw error;
  }
}
