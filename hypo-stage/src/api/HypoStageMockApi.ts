/**
 * Mock HypoStage API for standalone static build (e.g. Vercel).
 * Returns seed data; mutations throw (read-only demo).
 */
import type {
  HypoStageApi,
  GetHypothesesOptions,
  GetHypothesesStatsOptions,
  HypothesisStats,
} from './HypoStageApi';
import type {
  Hypothesis,
  HypothesisEvent,
  CreateHypothesisInput,
  UpdateHypothesisInput,
  CreateTechnicalPlanningInput,
  TechnicalPlanning,
  UpdateTechnicalPlanningInput,
} from '@archhypo/plugin-hypo-stage-backend';
import type {
  AgentRunDetail,
  AgentRunsPage,
  AgentsStatus,
  AgentSuggestion,
  AgentSuggestionReview,
  AgentSuggestionStatus,
  GetAgentRunsOptions,
  HypothesisReview,
  HypothesisReviewInput,
  PlanActionDecision,
  PlanProposal,
  CoverageFinding,
  IssuesReport,
  IssuesReportQuery,
  PlanningIssueLink,
} from './HypoStageApi';
import { seedHypotheses, getSeedEvents } from '../seedData';

const DEMO_READ_ONLY = 'This is a read-only demo. Use a local backend to create or edit data.';

function filterHypotheses(
  list: Hypothesis[],
  options?: GetHypothesesOptions,
): Hypothesis[] {
  if (!options) return list;
  let out = list;
  if (options.entityRef) {
    out = out.filter((h) => h.entityRefs.includes(options.entityRef!));
  }
  if (options.team) {
    out = out.filter((h) =>
      h.entityRefs.some((ref) => ref.includes(options.team!.toLowerCase().replace(/\s+/g, '-'))),
    );
  }
  return out;
}

function computeStats(list: Hypothesis[], sinceDays?: number): HypothesisStats {
  const now = Date.now();
  const since = sinceDays ? now - sinceDays * 24 * 60 * 60 * 1000 : 0;
  const byStatus: Record<string, number> = {};
  const byUncertainty: Record<string, number> = {};
  const byImpact: Record<string, number> = {};
  let inLast30Days = 0;
  let needAttention = 0;
  let canPostpone = 0;

  for (const h of list) {
    byStatus[h.status] = (byStatus[h.status] ?? 0) + 1;
    byUncertainty[h.uncertainty] = (byUncertainty[h.uncertainty] ?? 0) + 1;
    byImpact[h.impact] = (byImpact[h.impact] ?? 0) + 1;
    const updated = h.updatedAt instanceof Date ? h.updatedAt.getTime() : new Date(h.updatedAt).getTime();
    if (since && updated >= since) inLast30Days += 1;
    if (h.uncertainty === 'High' || h.uncertainty === 'Very High') {
      if (h.impact === 'High' || h.impact === 'Very High') needAttention += 1;
    }
    if (h.impact === 'Very Low' || h.impact === 'Low') canPostpone += 1;
  }

  return {
    total: list.length,
    byStatus,
    byUncertainty,
    byImpact,
    inLast30Days,
    needAttention,
    canPostpone,
  };
}

export class HypoStageMockApi implements HypoStageApi {
  async getEntityRefs(): Promise<string[]> {
    const refs = new Set<string>();
    for (const h of seedHypotheses) {
      h.entityRefs.forEach((r) => refs.add(r));
    }
    return Array.from(refs);
  }

  async getTeams(): Promise<string[]> {
    const teams = new Set<string>();
    for (const h of seedHypotheses) {
      for (const ref of h.entityRefs) {
        const m = ref.match(/component:default\/([^/]+)/);
        if (m) teams.add(m[1].replace(/-/g, ' '));
      }
    }
    return Array.from(teams).sort();
  }

  async getReferencedEntityRefs(): Promise<string[]> {
    return this.getEntityRefs();
  }

  async getHypothesesStats(options?: GetHypothesesStatsOptions): Promise<HypothesisStats> {
    const list = filterHypotheses(seedHypotheses, options);
    return computeStats(list, options?.sinceDays);
  }

  async getHypotheses(options?: GetHypothesesOptions): Promise<Hypothesis[]> {
    return filterHypotheses(seedHypotheses, options);
  }

  async getEvents(id: string): Promise<HypothesisEvent[]> {
    return getSeedEvents(id);
  }

  async createHypothesis(_input: CreateHypothesisInput): Promise<Hypothesis> {
    throw new Error(DEMO_READ_ONLY);
  }

  async updateHypothesis(_id: string, _input: UpdateHypothesisInput): Promise<Hypothesis> {
    throw new Error(DEMO_READ_ONLY);
  }

  async deleteHypothesis(_id: string): Promise<void> {
    throw new Error(DEMO_READ_ONLY);
  }

  async createTechnicalPlanning(
    _hypothesisId: string,
    _input: CreateTechnicalPlanningInput,
  ): Promise<TechnicalPlanning> {
    throw new Error(DEMO_READ_ONLY);
  }

  async updateTechnicalPlanning(
    _technicalPlanningId: string,
    _input: UpdateTechnicalPlanningInput,
  ): Promise<TechnicalPlanning> {
    throw new Error(DEMO_READ_ONLY);
  }

  async deleteTechnicalPlanning(_technicalPlanningId: string): Promise<void> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getAgentSuggestions(_hypothesisId: string, _status?: AgentSuggestionStatus): Promise<AgentSuggestion[]> {
    return [];
  }

  async reviewAgentSuggestion(_suggestionId: string, _status: 'accepted' | 'rejected'): Promise<AgentSuggestionReview> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getAgentsStatus(): Promise<AgentsStatus> {
    return {
      available: false,
      enabled: false,
      coach: { enabled: false, checkOnSave: false },
      planner: { enabled: false },
      issues: { triage: false, planIssues: false },
      coverage: { enabled: false },
    };
  }

  async getAgentRuns(_options?: GetAgentRunsOptions): Promise<AgentRunsPage> {
    return { items: [], total: 0, repositories: [] };
  }

  async getAgentRun(_runId: string): Promise<AgentRunDetail> {
    throw new Error(DEMO_READ_ONLY);
  }

  async reviewHypothesisDraft(_input: HypothesisReviewInput, _trigger: 'on_demand' | 'save'): Promise<HypothesisReview> {
    throw new Error(DEMO_READ_ONLY);
  }

  async proposeTechnicalPlan(_hypothesisId: string): Promise<PlanProposal> {
    throw new Error(DEMO_READ_ONLY);
  }

  async decidePlanAction(
    _proposalId: string,
    _index: number,
    _decision: PlanActionDecision,
    _technicalPlanningId?: string,
  ): Promise<void> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getPlanningIssues(_hypothesisId: string): Promise<PlanningIssueLink[]> {
    return [];
  }

  async openPlanningIssue(_technicalPlanningId: string, _repository?: string): Promise<PlanningIssueLink> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getCoverageFindings(_status?: CoverageFinding['status']): Promise<CoverageFinding[]> {
    return [];
  }

  async updateCoverageFinding(_id: string, _status: 'created' | 'dismissed'): Promise<void> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getIssuesReport(_query?: IssuesReportQuery): Promise<IssuesReport> {
    throw new Error(DEMO_READ_ONLY);
  }

  async getIssuesReportMarkdown(_query?: IssuesReportQuery): Promise<string> {
    throw new Error(DEMO_READ_ONLY);
  }
}
