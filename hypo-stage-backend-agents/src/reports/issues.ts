import type { Knex } from 'knex';
import { listFindings, CoverageFinding } from '../coverage/run';
import { listLinks, listObservations } from '../store/issues';

const DAY = 86_400_000;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  return Math.round(v * 10) / 10;
}

const countBy = <T>(items: T[], key: (item: T) => string | string[]) => {
  const out: Record<string, number> = {};
  for (const item of items) {
    const keys = key(item);
    for (const k of Array.isArray(keys) ? keys : [keys]) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};

export interface IssuesReport {
  period: { from: string; to: string };
  repository: string | null;
  reported: {
    total: number;
    byClassification: Record<string, number>;
    byQualityAttribute: Record<string, number>;
    related: number;
    unrelated: number;
    byHypothesis: Array<{ hypothesisId: string; statement: string | null; issues: number; evidence: Record<string, number> }>;
    resolution: { closed: number; open: number; medianDaysToClose: number | null; sameDayPercent: number | null };
  };
  planIssues: {
    total: number;
    byActionType: Record<string, number>;
    byMonth: Record<string, number>;
    open: number;
    completed: number;
    notPlanned: number;
    medianDaysToClose: number | null;
  };
  uncovered: CoverageFinding[];
}

/**
 * Maintenance report in the spirit of ArchHypo: reported issues by type and
 * quality attribute, related vs unrelated to hypotheses, resolution time; plus the plan
 * activities carried out as issues and uncovered themes.
 */
export async function buildIssuesReport(
  knex: Knex,
  options: { from: Date; to: Date; repository?: string },
): Promise<IssuesReport> {
  const observations = await listObservations(knex, { since: options.from, until: options.to, repository: options.repository });
  const hypothesisIds = Array.from(new Set(observations.flatMap(o => o.related.map(r => r.hypothesisId))));
  const statements = new Map<string, string>(
    hypothesisIds.length
      ? (await knex('hypothesis').whereIn('id', hypothesisIds).select('id', 'statement')).map((h: any) => [h.id, h.statement])
      : [],
  );

  const closed = observations.filter(o => o.closedAt);
  const closeDays = closed.map(o => (new Date(o.closedAt!).getTime() - new Date(o.createdAt).getTime()) / DAY);
  const byHypothesis = hypothesisIds.map(id => {
    const related = observations.filter(o => o.related.some(r => r.hypothesisId === id));
    return {
      hypothesisId: id,
      statement: statements.get(id) ?? null,
      issues: related.length,
      evidence: countBy(related, o => o.related.filter(r => r.hypothesisId === id).map(r => r.evidenceType)),
    };
  }).sort((a, b) => b.issues - a.issues);

  const links = (await listLinks(knex, { repository: options.repository })).filter(l => {
    const t = new Date(l.createdAt).getTime();
    return t >= options.from.getTime() && t <= options.to.getTime();
  });
  const planningTypes = new Map<string, string>(
    links.length
      ? (
          await knex('technicalPlanning')
            .whereIn('id', links.map(l => l.technicalPlanningId))
            .select('id', 'actionType')
        ).map((p: any) => [p.id, p.actionType])
      : [],
  );
  const closedLinks = links.filter(l => l.closedAt);

  const uncovered = (await listFindings(knex, { since: options.from })).filter(
    f => !options.repository || f.repository === options.repository,
  );

  return {
    period: { from: options.from.toISOString(), to: options.to.toISOString() },
    repository: options.repository ?? null,
    reported: {
      total: observations.length,
      byClassification: countBy(observations, o => o.classification ?? 'unclassified'),
      byQualityAttribute: countBy(observations, o => (o.qualityAttributes.length ? o.qualityAttributes : ['None'])),
      related: observations.filter(o => o.related.length > 0).length,
      unrelated: observations.filter(o => o.related.length === 0).length,
      byHypothesis,
      resolution: {
        closed: closed.length,
        open: observations.length - closed.length,
        medianDaysToClose: median(closeDays),
        sameDayPercent: closed.length ? Math.round((closeDays.filter(d => d < 1).length / closed.length) * 100) : null,
      },
    },
    planIssues: {
      total: links.length,
      byActionType: countBy(links, l => planningTypes.get(l.technicalPlanningId) ?? 'Unknown'),
      byMonth: countBy(links, l => l.createdAt.slice(0, 7)),
      open: links.filter(l => l.state === 'open').length,
      completed: links.filter(l => l.state === 'closed' && l.stateReason === 'completed').length,
      notPlanned: links.filter(l => l.state === 'closed' && l.stateReason === 'not_planned').length,
      medianDaysToClose: median(
        closedLinks.map(l => (new Date(l.closedAt!).getTime() - new Date(l.createdAt).getTime()) / DAY),
      ),
    },
    uncovered,
  };
}

const table = (header: string[], rows: Array<Array<string | number>>) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n');

const entries = (record: Record<string, number>) =>
  Object.entries(record).sort((a, b) => b[1] - a[1]);

export function reportToMarkdown(report: IssuesReport): string {
  const r = report.reported;
  const p = report.planIssues;
  const pct = (n: number) => (r.total ? `${Math.round((n / r.total) * 100)}%` : '—');
  return [
    `# Issues report (${report.period.from.slice(0, 10)} – ${report.period.to.slice(0, 10)})`,
    report.repository ? `Repository: ${report.repository}` : 'All configured repositories',
    '',
    '## Reported issues',
    `${r.total} issues were reported: ${entries(r.byClassification).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}. ` +
      `${r.related} (${pct(r.related)}) relate to at least one architectural hypothesis; ${r.unrelated} (${pct(r.unrelated)}) do not.`,
    '',
    table(['Quality attribute', 'Issues'], entries(r.byQualityAttribute)),
    '',
    '### Issues related to hypotheses',
    r.byHypothesis.length
      ? table(
          ['Hypothesis', 'Issues', 'Evidence'],
          r.byHypothesis.map(h => [
            h.statement ?? h.hypothesisId,
            h.issues,
            entries(h.evidence).map(([k, v]) => `${k}: ${v}`).join(', '),
          ]),
        )
      : 'No reported issue relates to a hypothesis.',
    '',
    '### Resolution',
    `${r.resolution.closed} closed, ${r.resolution.open} open. Median time to close: ${
      r.resolution.medianDaysToClose ?? '—'
    } days; ${r.resolution.sameDayPercent ?? '—'}% closed within a day (quick fixes suggest low impact, outside ArchHypo's scope).`,
    '',
    '## Technical plan activities as issues',
    `${p.total} plan issues: ${p.completed} completed, ${p.notPlanned} not planned, ${p.open} open. Median time to close: ${
      p.medianDaysToClose ?? '—'
    } days.`,
    '',
    table(['Action type', 'Issues'], entries(p.byActionType)),
    '',
    table(['Month', 'Plan issues opened'], Object.entries(p.byMonth).sort()),
    '',
    '## Uncovered themes',
    report.uncovered.length
      ? table(
          ['Component', 'Quality attribute', 'Issues', 'Theme', 'Draft hypothesis', 'Status'],
          report.uncovered.map(f => [
            f.entityRef ?? f.repository,
            f.qualityAttribute,
            f.issues.length,
            f.theme,
            f.draftStatement,
            f.status,
          ]),
        )
      : 'No recurring, costly theme outside the current hypotheses.',
    '',
  ].join('\n');
}
