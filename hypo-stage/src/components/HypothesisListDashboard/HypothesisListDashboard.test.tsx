import { default as React } from 'react';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import useAsync from 'react-use/lib/useAsync';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { HypothesisListDashboard } from './HypothesisListDashboard';

jest.mock('react-use/lib/useAsync', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseAsync = useAsync as jest.MockedFunction<typeof useAsync>;

const mockStats = {
  total: 5,
  byStatus: { Open: 2, 'In Review': 1, Validated: 2 },
  byUncertainty: { Medium: 2, High: 3 },
  byImpact: { High: 2, 'Very High': 1 },
  inLast30Days: 3,
  needAttention: 1,
  canPostpone: 2,
};

describe('HypothesisListDashboard', () => {
  const mockGetHypothesesStats = jest.fn().mockResolvedValue(mockStats);
  const mockApi = {
    getHypothesesStats: mockGetHypothesesStats,
    getHypotheses: jest.fn(),
    getTeams: jest.fn(),
    getReferencedEntityRefs: jest.fn(),
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
    mockGetHypothesesStats.mockResolvedValue(mockStats);
    mockUseAsync.mockImplementation((fn: () => Promise<unknown>) => {
      void fn(); // invoke so getHypothesesStats is called and we can assert on it
      return { value: mockStats, loading: false, error: undefined } as any;
    });
  });

  it('should render overview, focus insights and distribution when stats load', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard />
      </TestApiProvider>,
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Where to focus')).toBeInTheDocument();
    expect(screen.getByText('Need attention')).toBeInTheDocument();
    expect(screen.getByText('Can postpone')).toBeInTheDocument();
    expect(screen.getByText('Uncertainty & impact')).toBeInTheDocument();
    expect(screen.getByText('Uncertainty')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('should call getHypothesesStats with sinceDays when provided', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard sinceDays={60} />
      </TestApiProvider>,
    );

    expect(mockGetHypothesesStats).toHaveBeenCalledWith({ sinceDays: 60 });
  });

  it('should call getHypothesesStats with entityRef when scoped to component', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard entityRef="component:default/my-service" sinceDays={90} />
      </TestApiProvider>,
    );

    expect(mockGetHypothesesStats).toHaveBeenCalledWith({
      entityRef: 'component:default/my-service',
      sinceDays: 90,
    });
  });

  it('should call getHypothesesStats with team when selectedTeam is set', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard selectedTeam="TeamA" selectedComponentRef={null} sinceDays={90} />
      </TestApiProvider>,
    );

    expect(mockGetHypothesesStats).toHaveBeenCalledWith({
      team: 'TeamA',
      sinceDays: 90,
    });
  });

  it('should call getHypothesesStats with entityRef when selectedComponentRef is set', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard
          selectedTeam={null}
          selectedComponentRef="component:default/other"
          sinceDays={90}
        />
      </TestApiProvider>,
    );

    expect(mockGetHypothesesStats).toHaveBeenCalledWith({
      entityRef: 'component:default/other',
      sinceDays: 90,
    });
  });

  it('should show Progress when loading', async () => {
    mockUseAsync.mockReturnValue({ value: undefined, loading: true, error: undefined } as any);

    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard />
      </TestApiProvider>,
    );

    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should render nothing when stats fail', async () => {
    mockUseAsync.mockReturnValue({
      value: undefined,
      loading: false,
      error: new Error('Failed to fetch'),
    } as any);

    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockApi]]}>
        <HypothesisListDashboard />
      </TestApiProvider>,
    );

    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});
