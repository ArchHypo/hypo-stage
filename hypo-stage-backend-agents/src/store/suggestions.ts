import crypto from 'crypto';
import type { Knex } from 'knex';
import { toIso } from './dates';

export const SUGGESTION_KINDS = [
  'link',
  'reassessment',
  'planning_progress',
  'new_planning',
  'status_change',
  'rewrite',
  'evidence_alert',
] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded';

export interface Evidence {
  file: string;
  note: string;
}

/** A suggestion produced by the pipeline, before it is stored. */
export interface NewSuggestion {
  hypothesisId: string;
  technicalPlanningId: string | null;
  kind: SuggestionKind;
  payload: Record<string, unknown>;
  rationale: string;
  evidence: Evidence[];
  confidence: number;
}

export interface SuggestionSource {
  artifactRef: string;
  url: string;
  kind: 'pull_request' | 'issue';
}

export interface AgentSuggestion extends NewSuggestion {
  /** Every artifact backing this suggestion (more than one when merged by upsert). */
  sources: SuggestionSource[];
  id: string;
  /** Null for coach suggestions, which do not come from a PR analysis run. */
  runId: string | null;
  reviewId: string | null;
  artifactRef: string | null;
  artifactUrl: string | null;
  headSha: string | null;
  status: SuggestionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}


/** Sources of a row; rows written before multi-source support derive one from the artifact. */
function rowSources(row: any): SuggestionSource[] {
  if (row.sources) {
    return JSON.parse(row.sources);
  }
  if (!row.artifact_ref || !row.artifact_url) {
    return [];
  }
  return [
    {
      artifactRef: row.artifact_ref,
      url: row.artifact_url,
      kind: String(row.artifact_ref).includes('#issue/') ? 'issue' : 'pull_request',
    },
  ];
}

/** What distinguishes two pending suggestions of the same kind for the same target. */
function suggestionIdentity(kind: SuggestionKind, payload: Record<string, unknown>): unknown {
  switch (kind) {
    case 'link':
      return payload.url;
    case 'evidence_alert':
      return payload.evidenceType;
    case 'status_change':
      return payload.status;
    default:
      return null;
  }
}

function mapRow(row: any): AgentSuggestion {
  return {
    id: row.id,
    runId: row.run_id ?? null,
    reviewId: row.review_id ?? null,
    sources: rowSources(row),
    hypothesisId: row.hypothesis_id,
    technicalPlanningId: row.technical_planning_id ?? null,
    kind: row.kind,
    payload: JSON.parse(row.payload),
    rationale: row.rationale,
    evidence: JSON.parse(row.evidence),
    confidence: Number(row.confidence),
    artifactRef: row.artifact_ref ?? null,
    artifactUrl: row.artifact_url ?? null,
    headSha: row.head_sha ?? null,
    status: row.status,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: toIso(row.reviewed_at),
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export async function listSuggestions(
  knex: Knex,
  hypothesisId: string,
  status?: SuggestionStatus,
): Promise<AgentSuggestion[]> {
  const query = knex('agent_suggestions')
    .where('hypothesis_id', hypothesisId)
    .orderBy('createdAt', 'desc');
  if (status) {
    query.andWhere('status', status);
  }
  return (await query).map(mapRow);
}

export async function listSuggestionsForRun(knex: Knex, runId: string): Promise<AgentSuggestion[]> {
  return (await knex('agent_suggestions').where('run_id', runId).orderBy('createdAt', 'asc')).map(
    mapRow,
  );
}

export async function getSuggestion(knex: Knex, id: string): Promise<AgentSuggestion | null> {
  const row = await knex('agent_suggestions').where('id', id).first();
  return row ? mapRow(row) : null;
}

/**
 * Marks a pending suggestion as reviewed. Returns null when it does not exist and
 * 'conflict' when it was already reviewed or superseded.
 */
export async function reviewSuggestion(
  knex: Knex,
  id: string,
  status: 'accepted' | 'rejected',
  reviewedBy: string,
): Promise<AgentSuggestion | null | 'conflict'> {
  const now = new Date();
  const updated = await knex('agent_suggestions')
    .where({ id, status: 'pending' })
    .update({ status, reviewed_by: reviewedBy, reviewed_at: now, updatedAt: now });
  const suggestion = await getSuggestion(knex, id);
  if (!suggestion) {
    return null;
  }
  return updated === 0 ? 'conflict' : suggestion;
}

/** Supersedes pending suggestions for a PR, optionally restricted to some hypotheses. */
export async function supersedePending(
  knex: Knex,
  artifactRef: string,
  hypothesisIds?: string[],
): Promise<number> {
  const query = knex('agent_suggestions').where({ artifact_ref: artifactRef, status: 'pending' });
  if (hypothesisIds) {
    query.whereIn('hypothesis_id', hypothesisIds);
  }
  return query.update({ status: 'superseded', updatedAt: new Date() });
}

export async function insertSuggestions(
  knex: Knex,
  run: { runId: string; artifactRef: string; artifactUrl: string; headSha: string | null },
  suggestions: NewSuggestion[],
): Promise<void> {
  if (suggestions.length === 0) {
    return;
  }
  await knex('agent_suggestions').insert(
    suggestions.map(s => ({
      id: crypto.randomUUID(),
      run_id: run.runId,
      hypothesis_id: s.hypothesisId,
      technical_planning_id: s.technicalPlanningId,
      kind: s.kind,
      payload: JSON.stringify(s.payload),
      rationale: s.rationale,
      evidence: JSON.stringify(s.evidence),
      confidence: s.confidence,
      artifact_ref: run.artifactRef,
      artifact_url: run.artifactUrl,
      head_sha: run.headSha,
      status: 'pending',
    })),
  );
}

/** Stores a coach suggestion, which is tied to a review instead of a PR run. */
export async function insertCoachSuggestion(
  knex: Knex,
  reviewId: string,
  suggestion: NewSuggestion,
): Promise<void> {
  await knex('agent_suggestions').insert({
    id: crypto.randomUUID(),
    run_id: null,
    review_id: reviewId,
    hypothesis_id: suggestion.hypothesisId,
    technical_planning_id: suggestion.technicalPlanningId,
    kind: suggestion.kind,
    payload: JSON.stringify(suggestion.payload),
    rationale: suggestion.rationale,
    evidence: JSON.stringify(suggestion.evidence),
    confidence: suggestion.confidence,
    artifact_ref: null,
    artifact_url: null,
    head_sha: null,
    status: 'pending',
  });
}

/**
 * Idempotent insert used by the issue flows: at most one pending suggestion per
 * (hypothesis, planning, kind) — plus the URL for links. A match gets the new artifact
 * added to its sources instead of a duplicate row (e.g. "Fixes #N" PR + issue closed).
 * Returns the id of the created or merged suggestion.
 */
export async function upsertPendingSuggestion(
  knex: Knex,
  context: { runId: string | null; source: SuggestionSource; headSha?: string | null },
  suggestion: NewSuggestion,
): Promise<{ id: string; merged: boolean }> {
  const query = knex('agent_suggestions').where({
    hypothesis_id: suggestion.hypothesisId,
    kind: suggestion.kind,
    status: 'pending',
  });
  if (suggestion.technicalPlanningId) {
    query.andWhere('technical_planning_id', suggestion.technicalPlanningId);
  } else {
    query.whereNull('technical_planning_id');
  }
  const candidates = await query;
  const match = candidates.find(
    row =>
      suggestionIdentity(suggestion.kind, JSON.parse(row.payload)) ===
      suggestionIdentity(suggestion.kind, suggestion.payload),
  );

  if (match) {
    const sources: SuggestionSource[] = mapRow(match).sources;
    if (!sources.some(s => s.url === context.source.url)) {
      sources.push(context.source);
    }
    const rationale =
      match.rationale.includes(suggestion.rationale) || !suggestion.rationale
        ? match.rationale
        : `${match.rationale} ${suggestion.rationale}`.slice(0, 1500);
    await knex('agent_suggestions')
      .where('id', match.id)
      .update({
        sources: JSON.stringify(sources),
        confidence: Math.max(Number(match.confidence), suggestion.confidence),
        rationale,
        // Alerts carry the full, growing list of issues; keep the latest payload.
        ...(suggestion.kind === 'evidence_alert' ? { payload: JSON.stringify(suggestion.payload) } : {}),
        updatedAt: new Date(),
      });
    return { id: match.id, merged: true };
  }

  const id = crypto.randomUUID();
  await knex('agent_suggestions').insert({
    id,
    run_id: context.runId,
    review_id: null,
    hypothesis_id: suggestion.hypothesisId,
    technical_planning_id: suggestion.technicalPlanningId,
    kind: suggestion.kind,
    payload: JSON.stringify(suggestion.payload),
    rationale: suggestion.rationale,
    evidence: JSON.stringify(suggestion.evidence),
    confidence: suggestion.confidence,
    artifact_ref: context.source.artifactRef,
    artifact_url: context.source.url,
    head_sha: context.headSha ?? null,
    sources: JSON.stringify([context.source]),
    status: 'pending',
  });
  return { id, merged: false };
}

/** Supersedes pending suggestions of one kind that came from a given artifact. */
export async function supersedeFromSource(
  knex: Knex,
  artifactRef: string,
  kind: SuggestionKind,
): Promise<number> {
  return knex('agent_suggestions')
    .where({ artifact_ref: artifactRef, kind, status: 'pending' })
    .update({ status: 'superseded', updatedAt: new Date() });
}

/**
 * Plannings among `planningIds` that HypoStage already recorded as completed: an accepted
 * "completes" progress exists, reviewed after the plan issue was last reopened (if any).
 * Used to stop re-proposing completion of finished plan actions.
 */
export async function completedPlanningIds(knex: Knex, planningIds: string[]): Promise<Set<string>> {
  if (planningIds.length === 0) {
    return new Set();
  }
  const accepted = await knex('agent_suggestions')
    .whereIn('technical_planning_id', planningIds)
    .andWhere({ kind: 'planning_progress', status: 'accepted' })
    .select('technical_planning_id', 'payload', 'reviewed_at');
  const reopened = new Map<string, number>(
    (
      await knex('agent_issue_links')
        .whereIn('technical_planning_id', planningIds)
        .whereNotNull('reopened_at')
        .select('technical_planning_id', 'reopened_at')
    ).map((r: any) => [r.technical_planning_id, new Date(toIso(r.reopened_at)!).getTime()]),
  );
  const done = new Set<string>();
  for (const row of accepted) {
    if (JSON.parse(row.payload).effect !== 'completes') continue;
    const reviewedAt = row.reviewed_at ? new Date(toIso(row.reviewed_at)!).getTime() : 0;
    const reopenedAt = reopened.get(row.technical_planning_id);
    if (reopenedAt === undefined || reviewedAt > reopenedAt) {
      done.add(row.technical_planning_id);
    }
  }
  return done;
}

export async function isPlanningCompleted(knex: Knex, planningId: string): Promise<boolean> {
  return (await completedPlanningIds(knex, [planningId])).has(planningId);
}
