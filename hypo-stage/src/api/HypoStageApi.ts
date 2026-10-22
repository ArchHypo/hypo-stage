import { createApiRef, DiscoveryApi, FetchApi } from "@backstage/core-plugin-api";
import { CreateHypothesisInput, UpdateHypothesisInput, Hypothesis, HypothesisEvent, CreateTechnicalPlanningInput, TechnicalPlanning, UpdateTechnicalPlanningInput } from "@archhypo/plugin-hypo-stage-backend";

export type AgentSuggestionKind =
  | 'link'
  | 'reassessment'
  | 'planning_progress'
  | 'new_planning'
  | 'status_change'
  | 'rewrite'
  | 'evidence_alert';

export type AgentSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded';

type Likert = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export interface AgentSuggestionSource {
  artifactRef: string;
  url: string;
  kind: 'pull_request' | 'issue';
}

interface AgentSuggestionBase {
  id: string;
  /** Every artifact backing this suggestion (e.g. a PR and the plan issue it closes). */
  sources: AgentSuggestionSource[];
  /** Null for hypothesis coach suggestions, which do not come from a PR analysis. */
  runId: string | null;
  reviewId: string | null;
  hypothesisId: string;
  technicalPlanningId: string | null;
  rationale: string;
  evidence: Array<{ file: string; note: string }>;
  confidence: number;
  /** owner/repo#pull/N; null for coach suggestions. */
  artifactRef: string | null;
  /** Pull request URL, the value written to the hypothesis when applied; null for coach suggestions. */
  artifactUrl: string | null;
  headSha: string | null;
  status: AgentSuggestionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Result of reviewing a suggestion; accepting a completion may also close its plan issue. */
export type AgentSuggestionReview = AgentSuggestion & {
  issueClose?: { number: number; closed: boolean; error?: string } | null;
};

/** Change proposed by the HypoStage agents after analyzing a pull request. */
export type AgentSuggestion = AgentSuggestionBase &
  (
    | { kind: 'link'; payload: { url: string } }
    | {
        kind: 'reassessment';
        payload: { uncertainty: Likert; impact: Likert; previous: { uncertainty: Likert; impact: Likert } };
      }
    | { kind: 'planning_progress'; payload: { effect: 'advances' | 'completes'; expectedOutcome: string | null } }
    | {
        kind: 'new_planning';
        payload: {
          actionType: CreateTechnicalPlanningInput['actionType'];
          entityRef: string;
          description: string;
          expectedOutcome: string;
          targetDate: string;
          uncertainty?: Likert;
          impact?: Likert;
          previous?: { uncertainty: Likert; impact: Likert };
        };
      }
    | { kind: 'status_change'; payload: { status: UpdateHypothesisInput['status']; previous: string } }
    | {
        kind: 'evidence_alert';
        payload: { evidenceType: 'supports' | 'contradicts'; issues: string[] };
      }
    | {
        kind: 'rewrite';
        payload: {
          statement: string;
          previous: string;
          sourceType: UpdateHypothesisInput['sourceType'] | null;
          addQualityAttributes: UpdateHypothesisInput['qualityAttributes'];
          classification?: HypothesisReviewClassification;
        };
      }
  );

export type HypothesisReviewClassification = 'hypothesis' | 'requirement' | 'risk' | 'decision' | 'other';

/** Result of the hypothesis coach for one statement. */
export interface HypothesisReview {
  reviewId: string;
  verdict: 'ok' | 'needs_work';
  classification: HypothesisReviewClassification;
  classificationReason: string;
  falsifiable: boolean;
  refutingEvidence: string | null;
  issues: Array<{
    type: 'not_a_hypothesis' | 'not_falsifiable' | 'too_broad' | 'vague_terms' | 'solution_not_uncertainty' | 'other';
    severity: 'info' | 'warning';
    message: string;
    concept: string;
  }>;
  rewrites: Array<{ statement: string; reason: string }>;
  splitInto: string[];
  suggestedSourceType: UpdateHypothesisInput['sourceType'] | null;
  suggestedQualityAttributes: UpdateHypothesisInput['qualityAttributes'];
}

export interface HypothesisReviewInput {
  statement: string;
  sourceType?: string | null;
  qualityAttributes?: string[];
  entityRefs?: string[];
  notes?: string | null;
  /** Set when reviewing an existing hypothesis (edit form). */
  hypothesisId?: string | null;
}

export type AgentRunStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentRunSummary {
  id: string;
  repository: string;
  /** PR or issue number, depending on artifactKind. */
  prNumber: number;
  artifactKind?: 'pull_request' | 'issue';
  handler?: 'pr_analysis' | 'issue_triage' | 'plan_sync' | 'plan_comment';
  origin?: 'human' | 'hypostage';
  headSha: string | null;
  prUrl: string | null;
  triggerAction: string;
  modelKey: string;
  provider: string;
  status: AgentRunStatus;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  suggestionCount: number;
}

/** Triage step details written by the agents pipeline. */
export interface AgentTriageDetails {
  /** Candidates the model returned (missing on runs recorded before it was traced). */
  returned?: number;
  selected: Array<{ id: string; relevance: number; reason?: string }>;
  dropped?: Array<{ id: string; relevance: number; reason: string }>;
  /** Issue triage only. */
  classification?: string;
  qualityAttributes?: string[];
}

/** Assessment step details; PR runs and issue runs record different model fields. */
export interface AgentAssessDetails {
  hypothesisId: string;
  model?: {
    related: boolean;
    confidence: number;
    /** PR analysis and plan comments */
    reassessment?: { uncertainty: string | null; impact: string | null } | null;
    planningProgress?: Array<{ technicalPlanningId: string; effect: string }>;
    newPlanning?: { actionType: string } | null;
    statusChange?: { status: string } | null;
    /** Issue triage */
    evidenceType?: string;
  };
  kept?: AgentSuggestionKind[];
  dropped?: Array<{ kind: string; reason: string; technicalPlanningId?: string }>;
}

export interface AgentRunTraceStep {
  step: 'context' | 'triage' | 'assess' | string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  details?: Record<string, unknown>;
}

export interface AgentRunTrace {
  scope?: 'repository' | 'all-open';
  hypothesesInScope?: number;
  suggestions?: number;
  skippedReason?: string;
  steps: AgentRunTraceStep[];
}

export interface AgentRunDetail extends Omit<AgentRunSummary, 'suggestionCount'> {
  trace: AgentRunTrace | null;
  suggestions: AgentSuggestion[];
}

export interface AgentRunsPage {
  items: AgentRunSummary[];
  total: number;
  repositories: string[];
}

export interface GetAgentRunsOptions {
  repository?: string;
  status?: AgentRunStatus;
  limit?: number;
  offset?: number;
}

/** Whether the agents backend module is installed (available) and enabled in config. */
export interface AgentsStatus {
  available: boolean;
  enabled: boolean;
  coach: { enabled: boolean; checkOnSave: boolean };
  planner: { enabled: boolean };
  issues: { triage: boolean; planIssues: boolean };
  coverage: { enabled: boolean };
}

export const AGENTS_UNAVAILABLE: AgentsStatus = {
  available: false,
  enabled: false,
  coach: { enabled: false, checkOnSave: false },
  planner: { enabled: false },
  issues: { triage: false, planIssues: false },
  coverage: { enabled: false },
};

/** A technical planning opened as a GitHub issue by HypoStage. */
export interface PlanningIssueLink {
  technicalPlanningId: string;
  hypothesisId: string;
  repository: string;
  issueNumber: number;
  issueUrl: string;
  state: 'open' | 'closed';
  stateReason: string | null;
  createdAt: string;
  closedAt: string | null;
}

/** Thrown when the repository for a plan issue must be chosen by the user. */
export class RepositoryChoiceRequiredError extends Error {
  constructor(readonly repositories: string[]) {
    super('Choose the repository for this plan issue');
  }
}

export interface CoverageFinding {
  id: string;
  createdAt: string;
  repository: string;
  entityRef: string | null;
  qualityAttribute: string;
  windowDays: number;
  issues: string[];
  impactProxy: { issues: number; medianOpenDays: number; reopened: number; avgComments: number };
  theme: string;
  draftStatement: string;
  review: { verdict: string; rewrites: Array<{ statement: string }> } | null;
  status: 'pending' | 'created' | 'dismissed';
}

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

export interface IssuesReportQuery {
  from?: string;
  to?: string;
  repository?: string;
}

export type PlanGoal = 'accept_or_refute' | 'reduce_uncertainty' | 'reduce_impact' | 'define_postponement_criteria';

export type PlanStrategyProfile =
  | 'act_now'
  | 'investigate'
  | 'postpone_with_criteria'
  | 'reduce_impact'
  | 'monitor'
  | 'balanced';

/** One action proposed by the technical plan designer, ready for createTechnicalPlanning. */
export interface PlannedAction {
  actionType: CreateTechnicalPlanningInput['actionType'];
  goal: PlanGoal;
  entityRef: string;
  description: string;
  /** "Goal: … Evidence: … Expected effect: …" */
  expectedOutcome: string;
  evidence: string;
  expectedEffect: { uncertainty: string | null; impact: string | null };
  iteration: number;
  targetDate: string;
  rationale: string;
}

export interface PlanProposal {
  proposalId: string;
  hypothesisId: string;
  profile: PlanStrategyProfile;
  reading: string;
  actions: PlannedAction[];
  warnings: string[];
}

export type PlanActionDecision = 'added' | 'edited' | 'dismissed';

/** Parse backend error body so validation messages (e.g. targetDate) are shown to the user. */
async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body?.error?.message && typeof body.error.message === 'string') {
      return body.error.message;
    }
  } catch {
    // ignore JSON parse errors
  }
  return `${fallback}: ${response.statusText}`;
}

export interface GetHypothesesOptions {
  entityRef?: string;
  team?: string;
}

/** Dashboard stats: total, counts by status/uncertainty/impact, ArchHypo actionable counts. */
export interface HypothesisStats {
  total: number;
  byStatus: Record<string, number>;
  byUncertainty: Record<string, number>;
  byImpact: Record<string, number>;
  inLast30Days: number;
  /** High uncertainty and high impact — consider technical plans (ArchHypo). */
  needAttention: number;
  /** Low impact — safe to postpone decisions (ArchHypo). */
  canPostpone: number;
}

export interface GetHypothesesStatsOptions {
  entityRef?: string;
  team?: string;
  /** If set, only hypotheses updated in the last N days are counted (reduces load). */
  sinceDays?: number;
}

export interface HypoStageApi {
  getEntityRefs: () => Promise<string[]>;
  getTeams: () => Promise<string[]>;
  /** Entity refs that appear in at least one hypothesis (for filter dropdown). */
  getReferencedEntityRefs: () => Promise<string[]>;
  /** Dashboard stats with same filters as getHypotheses; optional sinceDays for time-bound. */
  getHypothesesStats: (options?: GetHypothesesStatsOptions) => Promise<HypothesisStats>;
  createHypothesis: (input: CreateHypothesisInput) => Promise<Hypothesis>;
  getHypotheses: (options?: GetHypothesesOptions) => Promise<Hypothesis[]>;
  updateHypothesis: (id: string, input: UpdateHypothesisInput) => Promise<Hypothesis>;
  getEvents: (id: string) => Promise<HypothesisEvent[]>;
  deleteHypothesis: (id: string) => Promise<void>;
  createTechnicalPlanning: (hypothesisId: string, input: CreateTechnicalPlanningInput) => Promise<TechnicalPlanning>;
  updateTechnicalPlanning: (technicalPlanningId: string, input: UpdateTechnicalPlanningInput) => Promise<TechnicalPlanning>;
  deleteTechnicalPlanning: (technicalPlanningId: string) => Promise<void>;
  /** Suggestions produced by the agents module (hypo-stage-backend-agents). */
  getAgentSuggestions: (hypothesisId: string, status?: AgentSuggestionStatus) => Promise<AgentSuggestion[]>;
  /** Records the review only; accepted suggestions are applied with the methods above. */
  reviewAgentSuggestion: (suggestionId: string, status: 'accepted' | 'rejected') => Promise<AgentSuggestionReview>;
  /** Never throws: reports available=false when the agents module is not installed. */
  getAgentsStatus: () => Promise<AgentsStatus>;
  getAgentRuns: (options?: GetAgentRunsOptions) => Promise<AgentRunsPage>;
  getAgentRun: (runId: string) => Promise<AgentRunDetail>;
  /** Asks the hypothesis coach to review a statement (draft or existing hypothesis). */
  reviewHypothesisDraft: (input: HypothesisReviewInput, trigger: 'on_demand' | 'save') => Promise<HypothesisReview>;
  /** Asks the technical plan designer for plan actions for a hypothesis. */
  proposeTechnicalPlan: (hypothesisId: string) => Promise<PlanProposal>;
  /** Records what the reviewer did with one proposed action. */
  decidePlanAction: (
    proposalId: string,
    index: number,
    decision: PlanActionDecision,
    technicalPlanningId?: string,
  ) => Promise<void>;
  /** Plan issues HypoStage created for the plannings of a hypothesis. */
  getPlanningIssues: (hypothesisId: string) => Promise<PlanningIssueLink[]>;
  /** Opens a technical planning as a GitHub issue; throws RepositoryChoiceRequiredError when ambiguous. */
  openPlanningIssue: (technicalPlanningId: string, repository?: string) => Promise<PlanningIssueLink>;
  getCoverageFindings: (status?: CoverageFinding['status']) => Promise<CoverageFinding[]>;
  updateCoverageFinding: (id: string, status: 'created' | 'dismissed') => Promise<void>;
  getIssuesReport: (query?: IssuesReportQuery) => Promise<IssuesReport>;
  getIssuesReportMarkdown: (query?: IssuesReportQuery) => Promise<string>;
}

export class HypoStageApiClient implements HypoStageApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  /**
   * All catalog component entity refs (for filter dropdown).
   * Returns [] on failure so generic Backstage without catalog integration still shows the list.
   */
  async getEntityRefs(): Promise<string[]> {
    try {
      const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
      const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/entity-refs`);
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }

  /**
   * Teams derived from components referenced by hypotheses (spec.team).
   * Returns [] on failure or when catalog has no spec.team — keeps plugin working in any Backstage.
   */
  async getTeams(): Promise<string[]> {
    try {
      const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
      const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/teams`);
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }

  /**
   * Entity refs that appear in at least one hypothesis (for filter dropdown).
   * Returns [] on failure so the list still renders without component filter.
   */
  async getReferencedEntityRefs(): Promise<string[]> {
    try {
      const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
      const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/referenced-entity-refs`);
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }

  async getHypothesesStats(options?: GetHypothesesStatsOptions): Promise<HypothesisStats> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const params = new URLSearchParams();
    if (options?.entityRef) params.set('entityRef', options.entityRef);
    if (options?.team) params.set('team', options.team);
    if (options?.sinceDays !== undefined) params.set('sinceDays', String(options.sinceDays));
    const query = params.toString();
    const url = query ? `${baseUrl}/hypotheses/stats?${query}` : `${baseUrl}/hypotheses/stats`;
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch hypothesis stats: ${response.statusText}`);
    }

    return response.json();
  }

  async createHypothesis(input: CreateHypothesisInput): Promise<Hypothesis> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create hypothesis: ${response.statusText}`);
    }

    return response.json();
  }

  async getHypotheses(options?: GetHypothesesOptions): Promise<Hypothesis[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const params = new URLSearchParams();
    if (options?.entityRef) params.set('entityRef', options.entityRef);
    if (options?.team) params.set('team', options.team);
    // Both filters can be applied together
    const query = params.toString();
    const url = query ? `${baseUrl}/hypotheses?${query}` : `${baseUrl}/hypotheses`;
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch hypotheses: ${response.statusText}`);
    }

    return response.json();
  }

  async updateHypothesis(id: string, input: UpdateHypothesisInput): Promise<Hypothesis> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to update hypothesis: ${response.statusText}`);
    }

    return response.json();
  }

  async getEvents(id: string): Promise<HypothesisEvent[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/${id}/events`);

    if (!response.ok) {
      throw new Error(`Failed to get events: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteHypothesis(id: string): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete hypothesis: ${response.statusText}`);
    }
  }

  async createTechnicalPlanning(hypothesisId: string, input: CreateTechnicalPlanningInput): Promise<TechnicalPlanning> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/${hypothesisId}/technical_plannings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const message = await getErrorMessage(response, 'Failed to create technical planning');
      throw new Error(message);
    }

    return response.json();
  }

  async updateTechnicalPlanning(technicalPlanningId: string, input: UpdateTechnicalPlanningInput): Promise<TechnicalPlanning> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/technical_plannings/${technicalPlanningId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const message = await getErrorMessage(response, 'Failed to update technical planning');
      throw new Error(message);
    }

    return response.json();
  }

  async deleteTechnicalPlanning(technicalPlanningId: string): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/technical_plannings/${technicalPlanningId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete technical planning: ${response.statusText}`);
    }
  }

  async getAgentSuggestions(hypothesisId: string, status?: AgentSuggestionStatus): Promise<AgentSuggestion[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/${hypothesisId}/agent-suggestions${query}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch agent suggestions: ${response.statusText}`);
    }

    return response.json();
  }

  async reviewAgentSuggestion(suggestionId: string, status: 'accepted' | 'rejected'): Promise<AgentSuggestionReview> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agent-suggestions/${suggestionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to review agent suggestion: ${response.statusText}`);
    }

    return response.json();
  }

  async getAgentsStatus(): Promise<AgentsStatus> {
    try {
      const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
      const response = await this.fetchApi.fetch(`${baseUrl}/agents/health`);
      if (!response.ok) {
        return AGENTS_UNAVAILABLE;
      }
      const body = await response.json();
      return {
        available: true,
        enabled: Boolean(body?.enabled),
        coach: {
          enabled: Boolean(body?.coach?.enabled),
          checkOnSave: Boolean(body?.coach?.checkOnSave),
        },
        planner: { enabled: Boolean(body?.planner?.enabled) },
        issues: {
          triage: Boolean(body?.issues?.triage),
          planIssues: Boolean(body?.issues?.planIssues),
        },
        coverage: { enabled: Boolean(body?.coverage?.enabled) },
      };
    } catch {
      return AGENTS_UNAVAILABLE;
    }
  }

  async getAgentRuns(options: GetAgentRunsOptions = {}): Promise<AgentRunsPage> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const params = new URLSearchParams();
    if (options.repository) params.set('repository', options.repository);
    if (options.status) params.set('status', options.status);
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    const query = params.toString();
    const response = await this.fetchApi.fetch(`${baseUrl}/agent-runs${query ? `?${query}` : ''}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch agent runs: ${response.statusText}`);
    }

    return response.json();
  }

  async getAgentRun(runId: string): Promise<AgentRunDetail> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agent-runs/${runId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch agent run: ${response.statusText}`);
    }

    return response.json();
  }

  async reviewHypothesisDraft(input: HypothesisReviewInput, trigger: 'on_demand' | 'save'): Promise<HypothesisReview> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/hypothesis-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...input, trigger }),
    });

    if (!response.ok) {
      let message = `Hypothesis review failed: ${response.statusText}`;
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') {
          message = body.error;
        }
      } catch {
        // keep the status text
      }
      throw new Error(message);
    }

    return response.json();
  }

  async proposeTechnicalPlan(hypothesisId: string): Promise<PlanProposal> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/plan-proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hypothesisId }),
    });

    if (!response.ok) {
      let message = `Plan designer failed: ${response.statusText}`;
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') {
          message = body.error;
        }
      } catch {
        // keep the status text
      }
      throw new Error(message);
    }

    return response.json();
  }

  async decidePlanAction(
    proposalId: string,
    index: number,
    decision: PlanActionDecision,
    technicalPlanningId?: string,
  ): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/plan-proposals/${proposalId}/actions/${index}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decision, technicalPlanningId: technicalPlanningId ?? null }),
    });

    if (!response.ok) {
      throw new Error(`Failed to record the plan action decision: ${response.statusText}`);
    }
  }

  async getPlanningIssues(hypothesisId: string): Promise<PlanningIssueLink[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(
      `${baseUrl}/agents/plannings/issues?hypothesisId=${encodeURIComponent(hypothesisId)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch plan issues: ${response.statusText}`);
    }
    return response.json();
  }

  async openPlanningIssue(technicalPlanningId: string, repository?: string): Promise<PlanningIssueLink> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/plannings/${technicalPlanningId}/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repository ? { repository } : {}),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 422 && Array.isArray(body?.repositories)) {
      throw new RepositoryChoiceRequiredError(body.repositories);
    }
    if (!response.ok) {
      throw new Error(typeof body?.error === 'string' ? body.error : `Failed to open the issue: ${response.statusText}`);
    }
    return body;
  }

  async getCoverageFindings(status?: CoverageFinding['status']): Promise<CoverageFinding[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const query = status ? `?status=${status}` : '';
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/coverage/findings${query}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch coverage findings: ${response.statusText}`);
    }
    return response.json();
  }

  async updateCoverageFinding(id: string, status: 'created' | 'dismissed'): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/coverage/findings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update the finding: ${response.statusText}`);
    }
  }

  private reportQuery(query: IssuesReportQuery = {}, extra: Record<string, string> = {}): string {
    const params = new URLSearchParams(extra);
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.repository) params.set('repository', query.repository);
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  async getIssuesReport(query?: IssuesReportQuery): Promise<IssuesReport> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/agents/reports/issues${this.reportQuery(query)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch the issues report: ${response.statusText}`);
    }
    return response.json();
  }

  async getIssuesReportMarkdown(query?: IssuesReportQuery): Promise<string> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(
      `${baseUrl}/agents/reports/issues${this.reportQuery(query, { format: 'markdown' })}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to export the issues report: ${response.statusText}`);
    }
    return response.text();
  }
}

export const HypoStageApiRef = createApiRef<HypoStageApi>({
  id: 'plugin.hypo-stage.service',
});
