import { createApiRef, DiscoveryApi, FetchApi } from "@backstage/core-plugin-api";
import { CreateHypothesisInput, UpdateHypothesisInput, Hypothesis, HypothesisEvent } from "@internal/plugin-hypo-stage-backend";

export interface HypoStageApi {
  getEntityRefs: () => Promise<string[]>;
  createHypothesis: (input: CreateHypothesisInput) => Promise<Hypothesis>;
  getHypotheses: () => Promise<Hypothesis[]>;
  updateHypothesis: (id: string, input: UpdateHypothesisInput) => Promise<Hypothesis>;
  getEvents: (id: string) => Promise<HypothesisEvent[]>;
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

  async getHypotheses(): Promise<Hypothesis[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('hypo-stage');
    const response = await this.fetchApi.fetch(`${baseUrl}/hypotheses`);

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
}

export const HypoStageApiRef = createApiRef<HypoStageApi>({
  id: 'plugin.hypo-stage.service',
});
