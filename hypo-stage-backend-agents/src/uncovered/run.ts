import crypto from 'crypto';
import type { Knex } from 'knex';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { z } from 'zod';
import { AgentsConfig, findModel, findRepository } from '../config';
import { reviewHypothesis } from '../coach/review';
import { ARCHHYPO_PRIMER } from '../pipeline/prompts';
import { generateStructured } from '../pipeline/llm';
import type { ModelRegistry } from '../providers/models';
import { IssueObservation, listObservations } from '../store/issues';
import type { RunTraceStep } from '../store/runs';
import { toIso } from '../store/dates';

const DAY = 86_400_000;

export interface CoverageDeps {
  knex: Knex;
  logger: LoggerService;
  config: AgentsConfig;
  models: ModelRegistry;
  resolveRepositoryEntityRefs: (repository: string) => Promise<string[]>;
  now?: () => Date;
}

export interface ImpactProxy {
  issues: number;
  medianOpenDays: number;
  reopened: number;
  avgComments: number;
}

export interface CoverageGroup {
  key: string;
  repository: string;
  entityRef: string | null;
  qualityAttribute: string;
  issues: IssueObservation[];
  proxy: ImpactProxy;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function impactProxy(issues: IssueObservation[], now: Date): ImpactProxy {
  const openDays = issues.map(i => {
    const end = i.closedAt ? new Date(i.closedAt) : now;
    return Math.max(0, (end.getTime() - new Date(i.createdAt).getTime()) / DAY);
  });
  return {
    issues: issues.length,
    medianOpenDays: Math.round(median(openDays) * 10) / 10,
    reopened: issues.filter(i => i.reopened > 0).length,
    avgComments: Math.round((issues.reduce((s, i) => s + i.comments, 0) / Math.max(1, issues.length)) * 10) / 10,
  };
}

/**
 * ArchHypo treats issues fixed quickly as low impact and out of scope;
 * only recurring themes that were costly to handle point at an unelicited uncertainty.
 */
export function qualifies(proxy: ImpactProxy, config: AgentsConfig['coverage']): boolean {
  return (
    proxy.issues >= config.minIssues &&
    (proxy.medianOpenDays >= config.minOpenDays || proxy.reopened > 0 || proxy.avgComments >= 3)
  );
}

/** Groups unrelated human issues by component and quality attribute. */
export async function groupUncoveredIssues(deps: CoverageDeps): Promise<CoverageGroup[]> {
  const now = deps.now?.() ?? new Date();
  const since = new Date(now.getTime() - deps.config.coverage.windowDays * DAY);
  const observations = (await listObservations(deps.knex, { since })).filter(o => {
    const repo = findRepository(deps.config, o.repository);
    return (
      o.related.length === 0 &&
      o.classification !== 'question' &&
      !o.labels.some(l => repo?.issues.ignoreLabels.includes(l))
    );
  });

  const entityByRepo = new Map<string, string | null>();
  const groups = new Map<string, CoverageGroup>();
  for (const o of observations) {
    if (!entityByRepo.has(o.repository)) {
      const refs = await deps.resolveRepositoryEntityRefs(o.repository).catch(() => []);
      entityByRepo.set(o.repository, refs[0] ?? null);
    }
    const entityRef = entityByRepo.get(o.repository) ?? null;
    for (const qa of o.qualityAttributes) {
      const key = `${o.repository}|${entityRef ?? ''}|${qa}`;
      const group = groups.get(key) ?? {
        key,
        repository: o.repository,
        entityRef,
        qualityAttribute: qa,
        issues: [],
        proxy: impactProxy([], now),
      };
      group.issues.push(o);
      groups.set(key, group);
    }
  }
  return Array.from(groups.values()).map(g => ({ ...g, proxy: impactProxy(g.issues, now) }));
}

const DraftSchema = z.object({
  theme: z.string().describe('One sentence naming the recurring problem'),
  statement: z
    .string()
    .describe('One falsifiable architectural hypothesis about the uncertainty behind the theme'),
});

const DRAFT_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

Task: several reported issues about the same component and quality attribute are not covered by any hypothesis, and they were costly to handle. Name the recurring theme and draft ONE architectural hypothesis that states the uncertain belief behind it, as a simple falsifiable statement (e.g. "It is possible to process batches of 1Gb per minute using just one server."). Do not invent facts beyond the issues.`;

export interface CoverageResult {
  groups: number;
  qualifying: number;
  findings: number;
}

/** Flow 2: proposes draft hypotheses for costly, recurring issue themes nobody covers. */
export async function runCoverage(deps: CoverageDeps): Promise<CoverageResult> {
  const { knex, config, logger } = deps;
  const groups = await groupUncoveredIssues(deps);
  const qualifying = groups.filter(g => qualifies(g.proxy, config.coverage));
  const modelKey = config.coach.model ?? config.planner.model ?? config.defaultModel;
  let findings = 0;
  if (!modelKey) {
    logger.warn('Coverage has no model: set agents.defaultModel');
    return { groups: groups.length, qualifying: qualifying.length, findings };
  }
  const modelDef = findModel(config, modelKey);

  for (const g of qualifying) {
    const urls = g.issues.map(i => i.url);
    const latest = await knex('agent_coverage_findings')
      .where('group_key', g.key)
      .orderBy('createdAt', 'desc')
      .first('status', 'issues');
    if (latest?.status === 'pending') continue;
    if (latest && urls.every(u => (JSON.parse(latest.issues) as string[]).includes(u))) continue;

    try {
      const trace: RunTraceStep[] = [];
      const draft = await generateStructured({
        model: deps.models.resolve(modelDef),
        schema: DraftSchema,
        system: DRAFT_SYSTEM_PROMPT,
        prompt: [
          `Component: ${g.entityRef ?? g.repository}`,
          `Quality attribute: ${g.qualityAttribute}`,
          `Impact proxy: ${g.proxy.issues} issues, median ${g.proxy.medianOpenDays} days open, ${g.proxy.reopened} reopened, ${g.proxy.avgComments} comments on average`,
          'Issues:',
          ...g.issues.map(i => `- #${i.number} [${i.classification ?? 'issue'}] ${i.title}`),
        ].join('\n'),
        step: 'coverage',
        trace,
      });
      let reviewId: string | null = null;
      if (config.coach.enabled && draft.statement.trim().length >= 20) {
        reviewId = await reviewHypothesis(
          { knex, logger, config, models: deps.models },
          {
            statement: draft.statement.trim().slice(0, 500),
            qualityAttributes: [g.qualityAttribute],
            entityRefs: g.entityRef ? [g.entityRef] : [],
          },
          'fallback',
          null,
        )
          .then(r => r.reviewId)
          .catch(() => null);
      }
      await knex('agent_coverage_findings').insert({
        id: crypto.randomUUID(),
        group_key: g.key,
        entity_ref: g.entityRef,
        repository: g.repository,
        quality_attribute: g.qualityAttribute,
        window_days: config.coverage.windowDays,
        issues: JSON.stringify(urls),
        impact_proxy: JSON.stringify(g.proxy),
        theme: draft.theme.slice(0, 500),
        draft_statement: draft.statement.trim().slice(0, 500),
        review_id: reviewId,
        status: 'pending',
      });
      findings++;
    } catch (error) {
      logger.warn('Coverage draft failed', { group: g.key, error: String(error) });
    }
  }

  if (findings > 0) {
    logger.info('Coverage finished', { groups: groups.length, qualifying: qualifying.length, findings });
  }
  return { groups: groups.length, qualifying: qualifying.length, findings };
}

export interface CoverageFinding {
  id: string;
  createdAt: string;
  repository: string;
  entityRef: string | null;
  qualityAttribute: string;
  windowDays: number;
  issues: string[];
  impactProxy: ImpactProxy;
  theme: string;
  draftStatement: string;
  review: { verdict: string; rewrites: Array<{ statement: string }> } | null;
  status: 'pending' | 'created' | 'dismissed';
}

export async function listFindings(
  knex: Knex,
  options: { status?: string; since?: Date } = {},
): Promise<CoverageFinding[]> {
  const query = knex('agent_coverage_findings as f')
    .leftJoin('agent_hypothesis_reviews as r', 'r.id', 'f.review_id')
    .select('f.*', 'r.result as review_result')
    .orderBy('f.createdAt', 'desc');
  if (options.status) query.where('f.status', options.status);
  if (options.since) query.where('f.createdAt', '>=', options.since);
  return (await query).map((row: any) => {
    const review = row.review_result ? JSON.parse(row.review_result) : null;
    return {
      id: row.id,
      createdAt: toIso(row.createdAt)!,
      repository: row.repository,
      entityRef: row.entity_ref ?? null,
      qualityAttribute: row.quality_attribute,
      windowDays: Number(row.window_days),
      issues: JSON.parse(row.issues),
      impactProxy: JSON.parse(row.impact_proxy),
      theme: row.theme,
      draftStatement: row.draft_statement,
      review: review ? { verdict: review.verdict, rewrites: review.rewrites ?? [] } : null,
      status: row.status,
    };
  });
}
