import { createApiRef, DiscoveryApi, FetchApi } from "@backstage/core-plugin-api";
import { Hypothesis } from "../types/hypothesis";

export interface HypoStageApi {
  getEntityRefs: () => Promise<string[]>;
  createHypothesis: (input: {
    entityRef: string;
    text: string;
    uncertainty: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    impact: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    technicalPlanning: string;
  }) => Promise<Hypothesis>;
  getHypotheses: () => Promise<Hypothesis[]>;
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

  async getEntityRefs(): Promise<string[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses/entity-refs`);

    return response.json();
  }

  async createHypothesis(input: {
    entityRef: string;
    text: string;
    uncertainty: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    impact: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    technicalPlanning: string;
  }): Promise<Hypothesis> {
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

  async getHypotheses(): Promise<Hypothesis[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses`);

    if (!response.ok) {
      throw new Error(`Failed to fetch hypotheses: ${response.statusText}`);
    }

    return response.json();
  }
}

export const HypoStageApiRef = createApiRef<HypoStageApi>({
  id: 'plugin.hypo-stage.service',
});
