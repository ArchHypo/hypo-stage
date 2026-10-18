import type { Knex } from 'knex';
import { toIso } from './dates';

const parse = <T>(v: unknown, fallback: T): T => {
  try {
    return typeof v === 'string' ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function toIssueRef(repository: string, number: number): string {
  return `${repository}#issue/${number}`;
}

// ---------- plan issues (issues HypoStage created from technical plannings) ----------

export interface IssueLink {
  technicalPlanningId: string;
  hypothesisId: string;
  repository: string;
  issueNumber: number;
  issueUrl: string;
  state: 'open' | 'closed';
  stateReason: string | null;
  createdBy: string | null;
  createdAt: string;
  closedAt: string | null;
  reopenedAt: string | null;
}

function mapLink(row: any): IssueLink {
  return {
    technicalPlanningId: row.technical_planning_id,
    hypothesisId: row.hypothesis_id,
    repository: row.repository,
    issueNumber: Number(row.issue_number),
    issueUrl: row.issue_url,
    state: row.state,
    stateReason: row.state_reason ?? null,
    createdBy: row.created_by ?? null,
    createdAt: toIso(row.createdAt)!,
    closedAt: toIso(row.closed_at),
    reopenedAt: toIso(row.reopened_at),
  };
}

export async function insertIssueLink(
  knex: Knex,
  link: Omit<IssueLink, 'createdAt' | 'closedAt' | 'reopenedAt' | 'state' | 'stateReason'>,
): Promise<void> {
  await knex('agent_issue_links').insert({
    technical_planning_id: link.technicalPlanningId,
    hypothesis_id: link.hypothesisId,
    repository: link.repository,
    issue_number: link.issueNumber,
    issue_url: link.issueUrl,
    created_by: link.createdBy,
  });
}

export async function findLinkByIssue(
  knex: Knex,
  repository: string,
  issueNumber: number,
): Promise<IssueLink | null> {
  const row = await knex('agent_issue_links')
    .whereRaw('lower(repository) = ?', [repository.toLowerCase()])
    .andWhere('issue_number', issueNumber)
    .first();
  return row ? mapLink(row) : null;
}

export async function findLinkByPlanning(knex: Knex, planningId: string): Promise<IssueLink | null> {
  const row = await knex('agent_issue_links').where('technical_planning_id', planningId).first();
  return row ? mapLink(row) : null;
}

export async function listLinksForHypothesis(knex: Knex, hypothesisId: string): Promise<IssueLink[]> {
  return (await knex('agent_issue_links').where('hypothesis_id', hypothesisId)).map(mapLink);
}

export async function listLinks(knex: Knex, options: { repository?: string } = {}): Promise<IssueLink[]> {
  const query = knex('agent_issue_links');
  if (options.repository) query.where('repository', options.repository);
  return (await query).map(mapLink);
}

export async function updateLinkState(
  knex: Knex,
  planningId: string,
  state: { state: 'open' | 'closed'; stateReason: string | null; closedAt: Date | null; reopenedAt?: Date },
): Promise<void> {
  await knex('agent_issue_links').where('technical_planning_id', planningId).update({
    state: state.state,
    state_reason: state.stateReason,
    closed_at: state.closedAt,
    ...(state.reopenedAt ? { reopened_at: state.reopenedAt } : {}),
  });
}

// ---------- observations of human issues (inputs for coverage and the report) ----------

export type EvidenceType = 'supports' | 'contradicts' | 'trigger_fired';

export interface IssueObservation {
  repository: string;
  number: number;
  url: string;
  title: string;
  author: string | null;
  labels: string[];
  state: 'open' | 'closed';
  stateReason: string | null;
  createdAt: string;
  closedAt: string | null;
  comments: number;
  reopened: number;
  classification: string | null;
  qualityAttributes: string[];
  related: Array<{ hypothesisId: string; evidenceType: EvidenceType }>;
}

function mapObservation(row: any): IssueObservation {
  return {
    repository: row.repository,
    number: Number(row.number),
    url: row.url,
    title: row.title,
    author: row.author ?? null,
    labels: parse(row.labels, []),
    state: row.state,
    stateReason: row.state_reason ?? null,
    createdAt: toIso(row.created_at)!,
    closedAt: toIso(row.closed_at),
    comments: Number(row.comments),
    reopened: Number(row.reopened),
    classification: row.classification ?? null,
    qualityAttributes: parse(row.quality_attributes, []),
    related: parse(row.related, []),
  };
}

export async function upsertObservation(knex: Knex, o: IssueObservation): Promise<void> {
  const existing = await knex('agent_issue_observations')
    .where({ repository: o.repository, number: o.number })
    .first();
  const row = {
    url: o.url,
    title: o.title,
    author: o.author,
    labels: JSON.stringify(o.labels),
    state: o.state,
    state_reason: o.stateReason,
    created_at: new Date(o.createdAt),
    closed_at: o.closedAt ? new Date(o.closedAt) : null,
    comments: o.comments,
    reopened: o.reopened,
    classification: o.classification,
    quality_attributes: JSON.stringify(o.qualityAttributes),
    related: JSON.stringify(o.related),
    analyzed_at: new Date(),
  };
  if (existing) {
    await knex('agent_issue_observations').where('id', existing.id).update(row);
  } else {
    await knex('agent_issue_observations').insert({ repository: o.repository, number: o.number, ...row });
  }
}

export async function listObservations(
  knex: Knex,
  options: { since?: Date; until?: Date; repository?: string } = {},
): Promise<IssueObservation[]> {
  const query = knex('agent_issue_observations').orderBy('created_at', 'asc');
  if (options.since) query.where('created_at', '>=', options.since);
  if (options.until) query.where('created_at', '<=', options.until);
  if (options.repository) query.where('repository', options.repository);
  return (await query).map(mapObservation);
}
