import { createApiRef, DiscoveryApi, FetchApi } from "@backstage/core-plugin-api";
import { CreateHypothesisInput, UpdateHypothesisInput, Hypothesis, HypothesisEvent, CreateTechnicalPlanningInput, TechnicalPlanning, UpdateTechnicalPlanningInput } from "@archhypo/plugin-hypo-stage-backend";

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
}

export const HypoStageApiRef = createApiRef<HypoStageApi>({
  id: 'plugin.hypo-stage.service',
});
