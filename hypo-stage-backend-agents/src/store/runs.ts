import crypto from 'crypto';
import type { Knex } from 'knex';
import { toIso } from './dates';
import { AgentSuggestion, listSuggestionsForRun } from './suggestions';

export const RUN_STATUSES = ['running', 'completed', 'failed', 'skipped'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export type ArtifactKind = 'pull_request' | 'issue';
export type RunHandler = 'pr_analysis' | 'issue_triage' | 'plan_sync' | 'plan_comment';
/** `hypostage` when the artifact that triggered the run was created by HypoStage itself. */
export type RunOrigin = 'human' | 'hypostage';

export interface RunTraceStep {
  step: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  details?: Record<string, unknown>;
}

export interface RunTrace {
  scope?: 'repository' | 'all-open';
  hypothesesInScope?: number;
  steps: RunTraceStep[];
  suggestions?: number;
  skippedReason?: string;
}

export interface AgentRun {
  id: string;
  repository: string;
  /** PR or issue number, depending on `artifactKind`. */
  prNumber: number;
  artifactKind: ArtifactKind;
  handler: RunHandler;
  origin: RunOrigin;
  headSha: string | null;
  prUrl: string | null;
  triggerAction: string;
  modelKey: string;
  provider: string;
  status: RunStatus;
  error: string | null;
  trace: RunTrace | null;
  startedAt: string;
  completedAt: string | null;
}


function mapRow(row: any): AgentRun {
  return {
    id: row.id,
    repository: row.repository,
    prNumber: Number(row.pr_number),
    artifactKind: row.artifact_kind ?? 'pull_request',
    handler: row.handler ?? 'pr_analysis',
    origin: row.origin ?? 'human',
    headSha: row.head_sha ?? null,
    prUrl: row.pr_url ?? null,
    triggerAction: row.trigger_action,
    modelKey: row.model_key,
    provider: row.provider,
    status: row.status,
    error: row.error ?? null,
    trace: row.trace ? JSON.parse(row.trace) : null,
    startedAt: toIso(row.started_at)!,
    completedAt: toIso(row.completed_at),
  };
}

export async function startRun(
  knex: Knex,
  input: {
    repository: string;
    prNumber: number;
    headSha: string | null;
    prUrl: string | null;
    triggerAction: string;
    modelKey: string;
    provider: string;
    artifactKind?: ArtifactKind;
    handler?: RunHandler;
    origin?: RunOrigin;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await knex('agent_runs').insert({
    id,
    repository: input.repository,
    pr_number: input.prNumber,
    head_sha: input.headSha,
    pr_url: input.prUrl,
    trigger_action: input.triggerAction,
    model_key: input.modelKey,
    provider: input.provider,
    artifact_kind: input.artifactKind ?? 'pull_request',
    handler: input.handler ?? 'pr_analysis',
    origin: input.origin ?? 'human',
    status: 'running',
    started_at: new Date(),
  });
  return id;
}

export async function finishRun(
  knex: Knex,
  id: string,
  result: { status: Exclude<RunStatus, 'running'>; trace: RunTrace; error?: string },
): Promise<void> {
  const now = new Date();
  await knex('agent_runs')
    .where('id', id)
    .update({
      status: result.status,
      trace: JSON.stringify(result.trace),
      error: result.error ?? null,
      completed_at: now,
      updatedAt: now,
    });
}

/** Runs that produced suggestions for the given hypothesis, newest first. */
export async function listRunsForHypothesis(
  knex: Knex,
  hypothesisId: string,
  limit: number,
): Promise<AgentRun[]> {
  const rows = await knex('agent_runs')
    .whereIn(
      'id',
      knex('agent_suggestions').distinct('run_id').where('hypothesis_id', hypothesisId),
    )
    .orderBy('started_at', 'desc')
    .limit(limit);
  return rows.map(mapRow);
}

export interface AgentRunSummary extends Omit<AgentRun, 'trace'> {
  suggestionCount: number;
}

export interface AgentRunList {
  items: AgentRunSummary[];
  total: number;
  /** Every repository that has runs, for filtering. */
  repositories: string[];
}

export async function listRuns(
  knex: Knex,
  options: { repository?: string; status?: RunStatus; limit: number; offset: number },
): Promise<AgentRunList> {
  const filtered = () => {
    const query = knex('agent_runs');
    if (options.repository) {
      query.where('repository', options.repository);
    }
    if (options.status) {
      query.where('status', options.status);
    }
    return query;
  };

  const suggestionCount = knex('agent_suggestions')
    .count('*')
    .whereRaw('agent_suggestions.run_id = agent_runs.id')
    .as('suggestion_count');

  const [rows, [{ total }], repositoryRows] = await Promise.all([
    filtered()
      .select('agent_runs.*', suggestionCount)
      .orderBy('started_at', 'desc')
      .limit(options.limit)
      .offset(options.offset),
    filtered().count({ total: '*' }),
    knex('agent_runs').distinct('repository').orderBy('repository'),
  ]);

  return {
    items: rows.map(row => {
      const { trace: _trace, ...run } = mapRow(row);
      return { ...run, suggestionCount: Number(row.suggestion_count) };
    }),
    total: Number(total),
    repositories: repositoryRows.map(r => r.repository as string),
  };
}

export interface AgentRunDetail extends AgentRun {
  suggestions: AgentSuggestion[];
}

export async function getRunDetail(knex: Knex, id: string): Promise<AgentRunDetail | null> {
  const row = await knex('agent_runs').where('id', id).first();
  if (!row) {
    return null;
  }
  return { ...mapRow(row), suggestions: await listSuggestionsForRun(knex, id) };
}
