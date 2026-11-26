import type { Knex } from 'knex';
import {
  CLOSED_STATUSES,
  HypothesisEventRecord,
  HypothesisRecord,
  TechnicalPlanningRecord,
} from '../domain/archhypo';
import type { PullRequestDetails, PullRequestFile } from '../github/client';

const RECENT_EVENTS_PER_HYPOTHESIS = 5;

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toDateString(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/** Loads open hypotheses with their technical plannings and recent evolution. */
export async function loadOpenHypotheses(knex: Knex): Promise<HypothesisRecord[]> {
  return loadHypotheses(knex, { openOnly: true });
}

/**
 * Loads hypotheses with their technical plannings and recent evolution.
 * Reads the tables owned by @archhypo/plugin-hypo-stage-backend; never writes them.
 */
export async function loadHypotheses(
  knex: Knex,
  options: { ids?: string[]; openOnly?: boolean } = {},
): Promise<HypothesisRecord[]> {
  const query = knex('hypothesis');
  if (options.openOnly) {
    query.whereNotIn('status', CLOSED_STATUSES as string[]);
  }
  if (options.ids) {
    query.whereIn('id', options.ids);
  }
  const rows = await query;
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map(r => r.id as string);

  const [plannings, events] = await Promise.all([
    knex('technicalPlanning').whereIn('hypothesisId', ids).orderBy('targetDate', 'asc'),
    knex('hypothesisEvents').whereIn('hypothesisId', ids).orderBy('timestamp', 'desc'),
  ]);

  const planningsByHypothesis = new Map<string, TechnicalPlanningRecord[]>();
  for (const p of plannings) {
    const list = planningsByHypothesis.get(p.hypothesisId) ?? [];
    list.push({
      id: p.id,
      hypothesisId: p.hypothesisId,
      entityRef: p.entityRef,
      actionType: p.actionType,
      description: p.description,
      expectedOutcome: p.expectedOutcome,
      documentations: parseJsonArray(p.documentations),
      targetDate: toDateString(p.targetDate),
    });
    planningsByHypothesis.set(p.hypothesisId, list);
  }

  const eventsByHypothesis = new Map<string, HypothesisEventRecord[]>();
  for (const e of events) {
    const list = eventsByHypothesis.get(e.hypothesisId) ?? [];
    if (list.length >= RECENT_EVENTS_PER_HYPOTHESIS) {
      continue;
    }
    let changes: Record<string, unknown> = {};
    try {
      changes = JSON.parse(e.changes ?? '{}');
    } catch {
      // keep empty
    }
    list.push({
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
      eventType: e.eventType,
      technicalPlanningId: e.technicalPlanningId ?? null,
      uncertainty: typeof changes.uncertainty === 'string' ? changes.uncertainty : null,
      impact: typeof changes.impact === 'string' ? changes.impact : null,
    });
    eventsByHypothesis.set(e.hypothesisId, list);
  }

  return rows.map(r => ({
    id: r.id,
    statement: r.statement,
    status: r.status,
    sourceType: r.sourceType,
    uncertainty: r.uncertainty,
    impact: r.impact,
    entityRefs: parseJsonArray(r.entityRefs),
    qualityAttributes: parseJsonArray(r.qualityAttributes),
    relatedArtefacts: parseJsonArray(r.relatedArtefacts),
    notes: r.notes ?? null,
    technicalPlannings: planningsByHypothesis.get(r.id) ?? [],
    recentEvents: eventsByHypothesis.get(r.id) ?? [],
  }));
}

/**
 * Keeps hypotheses attached to one of the repository's catalog entities. Falls back to
 * every open hypothesis when the repository is not linked to the catalog or no hypothesis
 * references its entities.
 */
export function scopeHypotheses(
  hypotheses: HypothesisRecord[],
  repositoryEntityRefs: string[],
): { scope: 'repository' | 'all-open'; hypotheses: HypothesisRecord[] } {
  if (repositoryEntityRefs.length > 0) {
    const refs = new Set(repositoryEntityRefs.map(r => r.toLowerCase()));
    const scoped = hypotheses.filter(h => h.entityRefs.some(ref => refs.has(ref.toLowerCase())));
    if (scoped.length > 0) {
      return { scope: 'repository', hypotheses: scoped };
    }
  }
  return { scope: 'all-open', hypotheses };
}

const IGNORED_FILE_PATTERNS = [
  /(^|\/)(yarn\.lock|package-lock\.json|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock)$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /(^|\/)(dist|build|vendor|node_modules)\//,
  /\.(png|jpe?g|gif|svg|ico|webp|pdf|zip|gz|woff2?|ttf|eot|mp4|mov)$/i,
  /\.snap$/,
];

export function isRelevantFile(file: PullRequestFile): boolean {
  return !IGNORED_FILE_PATTERNS.some(p => p.test(file.filename));
}

export interface DiffDigest {
  /** One line per changed file, including ignored ones. */
  fileList: string;
  /** Per-file patches within the character budget. */
  patches: Array<{ filename: string; patch: string }>;
  truncated: boolean;
}

/** Builds a size-bounded view of the PR diff, splitting the budget fairly across files. */
export function buildDiffDigest(pr: PullRequestDetails, maxChars: number): DiffDigest {
  const fileList = pr.files
    .map(f => `${f.status} ${f.filename} (+${f.additions}/-${f.deletions})`)
    .join('\n');

  const relevant = pr.files.filter(f => isRelevantFile(f) && f.patch);
  const budget = Math.max(0, maxChars - fileList.length);
  const perFile = relevant.length > 0 ? Math.max(400, Math.floor(budget / relevant.length)) : 0;

  const patches: DiffDigest['patches'] = [];
  let used = 0;
  let truncated = false;
  for (const file of relevant) {
    if (used >= budget) {
      truncated = true;
      break;
    }
    let patch = file.patch!;
    const allowed = Math.min(perFile, budget - used);
    if (patch.length > allowed) {
      patch = `${patch.slice(0, allowed)}\n… [truncated]`;
      truncated = true;
    }
    used += patch.length;
    patches.push({ filename: file.filename, patch });
  }

  return { fileList, patches, truncated };
}
