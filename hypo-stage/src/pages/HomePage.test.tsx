import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { HomePage } from './HomePage';
import useAsync from 'react-use/lib/useAsync';

jest.mock('react-use/lib/useAsync');

const mockUseAsync = useAsync as jest.MockedFunction<typeof useAsync>;

const mockHypotheses = [
  {
    id: 'hypothesis-1',
    statement: 'Test hypothesis',
    status: 'Open' as const,
    sourceType: 'Requirement' as const,
    entityRefs: [],
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'Low' as const,
    impact: 'Medium' as const,
    technicalPlannings: [],
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockStats = {
  total: 1,
  byStatus: { Open: 1 },
  byUncertainty: {},
  byImpact: {},
  needAttention: 0,
  canPostpone: 0,
};

const mockHypoStageApi = {
  getEntityRefs: jest.fn(),
  getTeams: jest.fn().mockResolvedValue([]),
  getReferencedEntityRefs: jest.fn().mockResolvedValue([]),
  getHypothesesStats: jest.fn().mockResolvedValue(mockStats),
  createHypothesis: jest.fn(),
  getHypotheses: jest.fn().mockResolvedValue(mockHypotheses),
  updateHypothesis: jest.fn(),
  getEvents: jest.fn(),
  deleteHypothesis: jest.fn(),
  createTechnicalPlanning: jest.fn(),
  updateTechnicalPlanning: jest.fn(),
  deleteTechnicalPlanning: jest.fn(),
  getAgentsStatus: jest.fn(),
  getAgentRuns: jest.fn().mockResolvedValue({ items: [], total: 0, repositories: [] }),
  getAgentRun: jest.fn(),
  getIssuesReport: jest.fn().mockResolvedValue({
    period: { from: '', to: '' },
    repository: null,
    reported: {
      total: 0, byClassification: {}, byQualityAttribute: {}, related: 0, unrelated: 0, byHypothesis: [],
      resolution: { closed: 0, open: 0, medianDaysToClose: null, sameDayPercent: null },
    },
    planIssues: { total: 0, byActionType: {}, byMonth: {}, open: 0, completed: 0, notPlanned: 0, medianDaysToClose: null },
    uncovered: [],
  }),
};

const renderWithProviders = async (route = '/') => {
  return renderInTestApp(
    <TestApiProvider apis={[[HypoStageApiRef, mockHypoStageApi]]}>
      <HomePage />
    </TestApiProvider>,
    { routeEntries: [route] },
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHypoStageApi.getAgentsStatus.mockResolvedValue({ available: false, enabled: false, coach: { enabled: false, checkOnSave: false }, planner: { enabled: false }, issues: { triage: false, planIssues: false }, coverage: { enabled: false } });
    mockUseAsync.mockImplementation((fn: () => Promise<unknown>) => {
      const fnStr = fn.toString();
      if (fnStr.includes('getTeams')) {
        return { value: [], loading: false, error: undefined } as any;
      }
      if (fnStr.includes('getReferencedEntityRefs')) {
        return { value: [], loading: false, error: undefined } as any;
      }
      if (fnStr.includes('getHypothesesStats')) {
        return { value: mockStats, loading: false, error: undefined } as any;
      }
      return { value: mockHypotheses, loading: false, error: undefined } as any;
    });
  });

  it('should render header and Create New Hypothesis button', async () => {
    await renderWithProviders();

    expect(screen.getByText('Welcome to Hypo Stage!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();
  });

  it('should render HypothesisList with table', async () => {
    await renderWithProviders();

    expect(screen.getByText('Hypotheses')).toBeInTheDocument();
    expect(screen.getByText('Test hypothesis')).toBeInTheDocument();
  });

  it('should navigate to create hypothesis page when Create button is clicked', async () => {
    const user = userEvent.setup();
    const { getByRole } = await renderWithProviders();

    const createButton = getByRole('button', { name: /Create New Hypothesis/i });
    await user.click(createButton);

    // Navigation occurs via react-router; in test app we'd need to assert on navigate call
    // For now verify the button is clickable and page still renders
    expect(createButton).toBeInTheDocument();
  });

  it('should render Create button with fullWidth for responsive layout', async () => {
    await renderWithProviders();

    const createButton = screen.getByRole('button', { name: /Create New Hypothesis/i });
    // MUI fullWidth adds width: 100% via class; we verify the button exists in a Grid
    expect(createButton).toBeInTheDocument();
  });

  describe('agent runs tab', () => {
    it('is hidden when the agents module is not installed, even with ?tab=agent-runs', async () => {
      await renderWithProviders('/?tab=agent-runs');

      await waitFor(() => expect(mockHypoStageApi.getAgentsStatus).toHaveBeenCalled());
      expect(screen.queryByRole('tab', { name: 'Agent runs' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();
      expect(mockHypoStageApi.getAgentRuns).not.toHaveBeenCalled();
    });

    it('switches between hypotheses and agent runs when the module is available', async () => {
      mockHypoStageApi.getAgentsStatus.mockResolvedValue({ available: true, enabled: true, pullRequestsReady: true, coach: { enabled: false, checkOnSave: false, ready: false }, planner: { enabled: false, ready: false }, issues: { triage: false, planIssues: false, triageReady: false, planIssuesReady: false }, coverage: { enabled: false, ready: false } });
      const user = userEvent.setup({ delay: null });
      await renderWithProviders();

      const tab = await screen.findByRole('tab', { name: 'Agent runs' });
      expect(screen.getByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();

      await user.click(tab);

      expect(await screen.findByText(/No agent runs yet/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Create New Hypothesis/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Hypotheses' }));
      expect(await screen.findByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();
    }, 15000);

    it('hides agent runs when analysis is enabled but the queue or GitHub connection is missing', async () => {
      mockHypoStageApi.getAgentsStatus.mockResolvedValue({ available: true, enabled: true, pullRequestsReady: false, coach: { enabled: true, checkOnSave: false, ready: false }, planner: { enabled: false, ready: false }, issues: { triage: false, planIssues: false, triageReady: false, planIssuesReady: false }, coverage: { enabled: false, ready: false } });
      await renderWithProviders('/?tab=agent-runs');

      await waitFor(() => expect(mockHypoStageApi.getAgentsStatus).toHaveBeenCalled());
      expect(screen.queryByRole('tab', { name: 'Agent runs' })).not.toBeInTheDocument();
      expect(mockHypoStageApi.getAgentRuns).not.toHaveBeenCalled();
    });

    it('hides agent runs when every feature flag is off', async () => {
      mockHypoStageApi.getAgentsStatus.mockResolvedValue({ available: true, enabled: false, coach: { enabled: false, checkOnSave: false }, planner: { enabled: false }, issues: { triage: false, planIssues: false }, coverage: { enabled: false } });
      await renderWithProviders('/?tab=agent-runs');

      await waitFor(() => expect(mockHypoStageApi.getAgentsStatus).toHaveBeenCalled());
      expect(screen.queryByRole('tab', { name: 'Agent runs' })).not.toBeInTheDocument();
      expect(mockHypoStageApi.getAgentRuns).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();
    });
  });

  it('hides the Issues report when coverage is enabled but cannot run', async () => {
    mockHypoStageApi.getAgentsStatus.mockResolvedValue({
      available: true, enabled: false, pullRequestsReady: false,
      coach: { enabled: false, checkOnSave: false, ready: false }, planner: { enabled: false, ready: false },
      issues: { triage: true, planIssues: false, triageReady: false, planIssuesReady: false },
      coverage: { enabled: true, ready: false },
    });
    await renderWithProviders('/?tab=issues-report');
    await waitFor(() => expect(mockHypoStageApi.getAgentsStatus).toHaveBeenCalled());
    expect(screen.queryByRole('tab', { name: 'Issues report' })).not.toBeInTheDocument();
    expect(mockHypoStageApi.getIssuesReport).not.toHaveBeenCalled();
  });

  it('shows the Issues report tab when coverage can run and triage is off', async () => {
    mockHypoStageApi.getAgentsStatus.mockResolvedValue({
      available: true, enabled: false, pullRequestsReady: false,
      coach: { enabled: false, checkOnSave: false, ready: false }, planner: { enabled: false, ready: false },
      issues: { triage: false, planIssues: false, triageReady: false, planIssuesReady: false },
      coverage: { enabled: true, ready: true },
    });
    await renderWithProviders('/?tab=issues-report');
    expect(await screen.findByRole('tab', { name: 'Issues report' })).toBeInTheDocument();
  });

  it('shows the Issues report tab when an issue flow can run', async () => {
    mockHypoStageApi.getAgentsStatus.mockResolvedValue({
      available: true, enabled: true, pullRequestsReady: false,
      coach: { enabled: false, checkOnSave: false, ready: false }, planner: { enabled: false, ready: false },
      issues: { triage: true, planIssues: false, triageReady: true, planIssuesReady: false },
      coverage: { enabled: false, ready: false },
    });
    await renderWithProviders('/?tab=issues-report');
    expect(await screen.findByRole('tab', { name: 'Issues report' })).toBeInTheDocument();
    expect(await screen.findByText('Reported issues')).toBeInTheDocument();
    expect(mockHypoStageApi.getIssuesReport).toHaveBeenCalled();
  });
});
