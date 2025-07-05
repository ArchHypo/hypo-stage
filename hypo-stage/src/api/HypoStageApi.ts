import { createApiRef, DiscoveryApi, FetchApi } from "@backstage/core-plugin-api";
import { Hypothesis } from "../types/hypothesis";

export interface HypoStageApi {
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
