import type { Knex } from 'knex';
import type { AgentsConfig } from '../config';
import { findRepository } from '../config';
import type { GitHubClient } from '../github/client';
import { PLAN_LABEL } from '../github/events';
import { loadHypotheses } from '../pipeline/context';
import { findLinkByPlanning, insertIssueLink, IssueLink } from '../store/issues';

export class PlanningNotFoundError extends Error {}
export class PlanIssueExistsError extends Error {
  constructor(readonly link: IssueLink) {
    super('This technical planning already has an issue');
  }
}
export class RepositoryRequiredError extends Error {
  constructor(readonly options: string[]) {
    super('Choose the repository for this plan issue');
  }
}

export interface PlanIssueDeps {
  knex: Knex;
  config: AgentsConfig;
  github: GitHubClient;
  /** github.com/project-slug of a catalog entity, when annotated. */
  resolveEntityRepository: (entityRef: string) => Promise<string | null>;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function planIssueContent(input: {
  hypothesis: { id: string; statement: string; uncertainty: string; impact: string };
  planning: { id: string; actionType: string; description: string; expectedOutcome: string; targetDate: string | null };
}) {
  const { hypothesis, planning } = input;
  const title = `[ArchHypo] ${planning.actionType}: ${
    planning.description.length > 80 ? `${planning.description.slice(0, 79)}…` : planning.description
  }`;
  const body = [
    `This task is a **${planning.actionType}** from the technical plan of an architectural hypothesis managed with ArchHypo in HypoStage.`,
    '',
    `**Hypothesis:** ${hypothesis.statement}`,
    `**Assessment:** uncertainty ${hypothesis.uncertainty}, impact ${hypothesis.impact}`,
    '',
    `**What to do:** ${planning.description}`,
    '',
    `**Expected outcome:** ${planning.expectedOutcome}`,
    planning.targetDate ? `**Target date:** ${planning.targetDate}` : null,
    '',
    'Comment here with results (measurements, findings). HypoStage reads them as evidence for this plan, and closing the issue as completed proposes the plan action as done.',
    '',
    `<!-- hypostage:planning=${planning.id} -->`,
  ]
    .filter(line => line !== null)
    .join('\n');
  const labels = [PLAN_LABEL, `archhypo:${slug(planning.actionType)}`, `archhypo:hyp-${hypothesis.id.slice(0, 8)}`];
  return { title, body, labels };
}

/** Flow 3: opens a technical planning as an issue in the component's repository. */
export async function openPlanIssue(
  deps: PlanIssueDeps,
  planningId: string,
  requestedBy: string,
  repositoryOverride?: string,
): Promise<IssueLink> {
  const existing = await findLinkByPlanning(deps.knex, planningId);
  if (existing) {
    throw new PlanIssueExistsError(existing);
  }
  const row = await deps.knex('technicalPlanning').where('id', planningId).first('hypothesisId');
  if (!row) {
    throw new PlanningNotFoundError('Technical planning not found');
  }
  const [hypothesis] = await loadHypotheses(deps.knex, { ids: [row.hypothesisId] });
  const planning = hypothesis?.technicalPlannings.find(p => p.id === planningId);
  if (!hypothesis || !planning) {
    throw new PlanningNotFoundError('Technical planning not found');
  }

  const allowed = deps.config.repositories.filter(r => r.issues.planIssues).map(r => r.repository);
  const annotated = await deps.resolveEntityRepository(planning.entityRef).catch(() => null);
  const candidate = repositoryOverride ?? annotated;
  const repository = candidate && findRepository(deps.config, candidate)?.issues.planIssues ? candidate : null;
  if (!repository) {
    throw new RepositoryRequiredError(allowed);
  }

  const content = planIssueContent({ hypothesis, planning });
  const created = await deps.github.createIssue(repository, content);
  const link = {
    technicalPlanningId: planning.id,
    hypothesisId: hypothesis.id,
    repository,
    issueNumber: created.number,
    issueUrl: created.url,
    createdBy: requestedBy,
  };
  await insertIssueLink(deps.knex, link);
  return {
    ...link,
    state: 'open',
    stateReason: null,
    createdAt: new Date().toISOString(),
    closedAt: null,
    reopenedAt: null,
  };
}
