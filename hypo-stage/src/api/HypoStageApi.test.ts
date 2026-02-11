import { HypoStageApiClient } from './HypoStageApi';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

describe('HypoStageApiClient', () => {
  let mockDiscoveryApi: jest.Mocked<DiscoveryApi>;
  let mockFetchApi: jest.Mocked<FetchApi>;
  let apiClient: HypoStageApiClient;

  beforeEach(() => {
    mockDiscoveryApi = {
      getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/hypo-stage'),
    } as any;

    mockFetchApi = {
      fetch: jest.fn(),
    } as any;

    apiClient = new HypoStageApiClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchApi,
    });
  });

  describe('deleteHypothesis', () => {
    it('should successfully delete a hypothesis', async () => {
      const hypothesisId = 'test-hypothesis-id';
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      await apiClient.deleteHypothesis(hypothesisId);

      expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('hypo-stage');
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses/test-hypothesis-id',
        {
          method: 'DELETE',
        },
      );
    });

    it('should throw an error when delete fails', async () => {
      const hypothesisId = 'test-hypothesis-id';
      mockFetchApi.fetch!.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(apiClient.deleteHypothesis(hypothesisId)).rejects.toThrow(
        'Failed to delete hypothesis: Not Found',
      );
    });

    it('should throw an error on network failure', async () => {
      const hypothesisId = 'test-hypothesis-id';
      mockFetchApi.fetch!.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.deleteHypothesis(hypothesisId)).rejects.toThrow('Network error');
    });
  });

  describe('getHypotheses', () => {
    it('should fetch all hypotheses', async () => {
      const mockHypotheses = [
        {
          id: '1',
          statement: 'Test hypothesis',
          status: 'Open',
        },
      ];
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHypotheses),
      } as any);

      const result = await apiClient.getHypotheses();

      expect(result).toEqual(mockHypotheses);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses',
      );
    });

    it('should pass entityRef and team as query params when provided', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      } as any);

      await apiClient.getHypotheses({ entityRef: 'component:default/my-service' });
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses?entityRef=component%3Adefault%2Fmy-service',
      );

      await apiClient.getHypotheses({ team: 'TeamA' });
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses?team=TeamA',
      );
    });
  });

  describe('getReferencedEntityRefs', () => {
    it('should fetch referenced entity refs list', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(['component:default/foo', 'component:default/bar']),
      } as any);

      const result = await apiClient.getReferencedEntityRefs();

      expect(result).toEqual(['component:default/foo', 'component:default/bar']);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses/referenced-entity-refs',
      );
    });

    it('should return empty array when request fails (optional for generic Backstage)', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
      } as Response);

      const result = await apiClient.getReferencedEntityRefs();
      expect(result).toEqual([]);
    });
  });

  describe('getHypothesesStats', () => {
    it('should fetch stats with no filters', async () => {
      const stats = {
        total: 10,
        byStatus: { Open: 5, Validated: 3 },
        byUncertainty: { High: 4 },
        byImpact: { Medium: 6 },
        inLast30Days: 2,
        needAttention: 2,
        canPostpone: 1,
      };
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(stats),
      } as any);

      const result = await apiClient.getHypothesesStats();

      expect(result).toEqual(stats);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses/stats',
      );
    });

    it('should fetch stats with entityRef, team and sinceDays', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          total: 2,
          byStatus: {},
          byUncertainty: {},
          byImpact: {},
          inLast30Days: 1,
          needAttention: 0,
          canPostpone: 0,
        }),
      } as any);

      await apiClient.getHypothesesStats({
        entityRef: 'component:default/my-svc',
        team: 'TeamA',
        sinceDays: 90,
      });

      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses/stats?entityRef=component%3Adefault%2Fmy-svc&team=TeamA&sinceDays=90',
      );
    });

    it('should throw when request fails', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
      } as Response);

      await expect(apiClient.getHypothesesStats()).rejects.toThrow(
        'Failed to fetch hypothesis stats: Server Error',
      );
    });
  });

  describe('getTeams', () => {
    it('should fetch teams list', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(['TeamA', 'TeamB']),
      } as any);

      const result = await apiClient.getTeams();

      expect(result).toEqual(['TeamA', 'TeamB']);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses/teams',
      );
    });

    it('should return empty array when request fails (optional for generic Backstage)', async () => {
      mockFetchApi.fetch!.mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
      } as Response);

      const result = await apiClient.getTeams();
      expect(result).toEqual([]);
    });
  });

  describe('createHypothesis', () => {
    it('should create a hypothesis', async () => {
      const input = {
        statement: 'New hypothesis that is long enough for validation',
        entityRefs: [],
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: [],
        uncertainty: 'Medium' as const,
        impact: 'High' as const,
        notes: null,
      };
      const mockHypothesis = { id: '1', ...input };
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHypothesis),
      } as any);

      const result = await apiClient.createHypothesis(input);

      expect(result).toEqual(mockHypothesis);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/hypotheses',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
    });
  });

  describe('updateHypothesis', () => {
    it('should update a hypothesis', async () => {
      const id = 'test-id';
      const input = {
        entityRefs: [],
        status: 'Open' as const,
        sourceType: 'Requirements' as const,
        relatedArtefacts: [],
        qualityAttributes: [],
        uncertainty: 'Medium' as const,
        impact: 'High' as const,
        notes: null,
      };
      const mockHypothesis = { id, statement: 'Updated hypothesis', ...input };
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHypothesis),
      } as any);

      const result = await apiClient.updateHypothesis(id, input);

      expect(result).toEqual(mockHypothesis);
      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        `http://localhost:7007/api/hypo-stage/hypotheses/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
    });
  });

  describe('deleteTechnicalPlanning', () => {
    it('should successfully delete technical planning', async () => {
      const technicalPlanningId = 'test-planning-id';
      mockFetchApi.fetch!.mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      await apiClient.deleteTechnicalPlanning(technicalPlanningId);

      expect(mockFetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/hypo-stage/technical_plannings/test-planning-id',
        {
          method: 'DELETE',
        },
      );
    });
  });
});
