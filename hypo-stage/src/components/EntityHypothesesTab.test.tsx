import { default as React } from 'react';
import { screen } from '@testing-library/react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { EntityHypothesesTab } from './EntityHypothesesTab';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;

const mockHypotheses = [
  {
    id: 'h1',
    statement: 'Hypothesis for this component',
    status: 'Open' as const,
    entityRefs: ['component:default/my-service'],
    sourceType: 'Requirements' as const,
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'Medium' as const,
    impact: 'High' as const,
    technicalPlannings: [],
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('EntityHypothesesTab', () => {
  const mockGetHypotheses = jest.fn().mockResolvedValue(mockHypotheses);
  const mockApi = {
    getHypotheses: mockGetHypotheses,
    getTeams: jest.fn().mockResolvedValue([]),
    getReferencedEntityRefs: jest.fn().mockResolvedValue([]),
    getHypothesesStats: jest.fn().mockResolvedValue({
    total: 1,
    byStatus: { Open: 1 },
    byUncertainty: {},
    byImpact: {},
    inLast30Days: 1,
    needAttention: 0,
    canPostpone: 0,
  }),
    getEntityRefs: jest.fn(),
    createHypothesis: jest.fn(),
    updateHypothesis: jest.fn(),
    getEvents: jest.fn(),
    deleteHypothesis: jest.fn(),
    createTechnicalPlanning: jest.fn(),
    updateTechnicalPlanning: jest.fn(),
    deleteTechnicalPlanning: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHypotheses.mockResolvedValue(mockHypotheses);
    mockUseEntity.mockReturnValue({
      entity: {
        kind: 'component',
        metadata: { name: 'my-service', namespace: 'default' },
        spec: {},
      },
      loading: false,
      error: undefined,
    } as any);
  });

  it('should render HypothesisList and call getHypotheses with entityRef', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <EntityHypothesesTab />
      </TestApiProvider>,
    );

    expect(screen.getByText('Hypotheses')).toBeInTheDocument();
    expect(mockGetHypotheses).toHaveBeenCalledWith({ entityRef: 'component:default/my-service' });
  });

  it('should not show team filter when scoped to entity', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <EntityHypothesesTab />
      </TestApiProvider>,
    );

    expect(screen.queryByLabelText(/Team/i)).not.toBeInTheDocument();
  });
});
