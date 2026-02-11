import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { HypothesisList } from './HypothesisList';
import { NotificationProvider } from '../providers/NotificationProvider';
import useAsync from 'react-use/lib/useAsync';

// Mock useAsync
jest.mock('react-use/lib/useAsync');

const mockUseAsync = useAsync as jest.MockedFunction<typeof useAsync>;

const mockHypotheses = [
  {
    id: 'hypothesis-1',
    statement: 'First test hypothesis statement',
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
  {
    id: 'hypothesis-2',
    statement: 'Second test hypothesis statement that is longer',
    status: 'Closed' as const,
    sourceType: 'Solution' as const,
    entityRefs: [],
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'High' as const,
    impact: 'High' as const,
    technicalPlannings: [],
    notes: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'hypothesis-3',
    statement: 'Third hypothesis with low impact',
    status: 'Open' as const,
    sourceType: 'Requirement' as const,
    entityRefs: [],
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'Medium' as const,
    impact: 'Low' as const,
    technicalPlannings: [],
    notes: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
];

const mockStats = {
  total: 2,
  byStatus: { Open: 2 },
  byUncertainty: {},
  byImpact: {},
  inLast30Days: 1,
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
};

const renderWithProviders = async (ui: React.ReactElement) => {
  return renderInTestApp(
    <TestApiProvider apis={[[HypoStageApiRef, mockHypoStageApi]]}>
      <NotificationProvider>{ui}</NotificationProvider>
    </TestApiProvider>,
  );
};

describe('HypothesisList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should render dashboard and hypotheses table', async () => {
    await renderWithProviders(<HypothesisList />);

    expect(screen.getByText('Hypotheses')).toBeInTheDocument();
    expect(screen.getByText('First test hypothesis statement')).toBeInTheDocument();
    expect(screen.getByText('Second test hypothesis statement that is longer')).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    mockUseAsync.mockReturnValue({
      value: undefined,
      loading: true,
      error: undefined,
    } as any);

    await renderWithProviders(<HypothesisList />);
    // Progress component is rendered
    expect(screen.queryByText('Hypotheses')).not.toBeInTheDocument();
  });

  it('should show error state', async () => {
    mockUseAsync.mockReturnValue({
      value: undefined,
      loading: false,
      error: new Error('Failed to fetch'),
    } as any);

    await renderWithProviders(<HypothesisList />);
    expect(screen.getAllByText(/Failed to fetch/i).length).toBeGreaterThan(0);
  });

  it('should sort hypotheses by creation date (latest first)', async () => {
    await renderWithProviders(<HypothesisList />);

    const rows = screen.getAllByRole('row');
    // First row is header; data rows newest first → hypothesis-3, hypothesis-2, hypothesis-1
    expect(rows[1]).toHaveTextContent('Third hypothesis with low impact');
    expect(rows[2]).toHaveTextContent('Second test hypothesis statement that is longer');
    expect(rows[3]).toHaveTextContent('First test hypothesis statement');
  });

  it('should show team and component filters when entityRef is not provided', async () => {
    await renderWithProviders(<HypothesisList />);
    expect(screen.getByLabelText(/Team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Component/i)).toBeInTheDocument();
  });

  it('should not show team or component filter when entityRef is provided', async () => {
    await renderWithProviders(<HypothesisList entityRef="component:default/my-service" />);
    expect(screen.queryByLabelText(/Team/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Component/i)).not.toBeInTheDocument();
  });

  it('should show Focus filter (by focus type)', async () => {
    await renderWithProviders(<HypothesisList />);
    expect(screen.getByLabelText(/Filter by focus type/i)).toBeInTheDocument();
  });

  it('should show Focus filter when entityRef is provided', async () => {
    await renderWithProviders(<HypothesisList entityRef="component:default/my-service" />);
    expect(screen.getByLabelText(/Filter by focus type/i)).toBeInTheDocument();
  });

  it('should filter list by Focus type when "Need attention" is selected', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HypothesisList />);

    const focusInput = screen.getByLabelText(/Filter by focus type/i);
    await user.click(focusInput);
    const needAttentionOption = await screen.findByRole('option', { name: 'Need attention' });
    await user.click(needAttentionOption);

    await waitFor(() => {
      expect(screen.getByText('Second test hypothesis statement that is longer')).toBeInTheDocument();
      expect(screen.queryByText('First test hypothesis statement')).not.toBeInTheDocument();
      expect(screen.queryByText('Third hypothesis with low impact')).not.toBeInTheDocument();
    });
  });

  it('should filter list by Focus type when "Can postpone" is selected', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HypothesisList />);

    const focusInput = screen.getByLabelText(/Filter by focus type/i);
    await user.click(focusInput);
    const canPostponeOption = await screen.findByRole('option', { name: 'Can postpone' });
    await user.click(canPostponeOption);

    await waitFor(() => {
      expect(screen.getByText('Third hypothesis with low impact')).toBeInTheDocument();
      expect(screen.queryByText('First test hypothesis statement')).not.toBeInTheDocument();
      expect(screen.queryByText('Second test hypothesis statement that is longer')).not.toBeInTheDocument();
    });
  });

  it('should filter list by "No tag" when selected', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HypothesisList />);

    const focusInput = screen.getByLabelText(/Filter by focus type/i);
    await user.click(focusInput);
    const noTagOption = await screen.findByRole('option', { name: 'No tag' });
    await user.click(noTagOption);

    await waitFor(() => {
      expect(screen.getByText('First test hypothesis statement')).toBeInTheDocument();
      expect(screen.queryByText('Second test hypothesis statement that is longer')).not.toBeInTheDocument();
      expect(screen.queryByText('Third hypothesis with low impact')).not.toBeInTheDocument();
    });
  });

  describe('Delete functionality', () => {
    const secondHypothesisStatement = 'Second test hypothesis statement that is longer';

    const openDeleteDialogForSecondHypothesis = async (user: ReturnType<typeof userEvent.setup>) => {
      const deleteButtons = screen.getAllByLabelText(/Delete hypothesis/i);
      // Rows order: header, then newest first → hypothesis-3, hypothesis-2, hypothesis-1
      const row2Index = 1; // second data row = hypothesis-2
      await user.click(deleteButtons[row2Index]);
    };

    it('should open delete dialog when delete icon is clicked', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisList />);

      await waitFor(() => {
        expect(screen.getByText('First test hypothesis statement')).toBeInTheDocument();
      });
      const deleteButtons = screen.getAllByLabelText(/Delete hypothesis/i);
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete hypothesis?')).toBeInTheDocument();
    });

    it('should show correct hypothesis statement in delete dialog', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisList />);

      await openDeleteDialogForSecondHypothesis(user);

      expect(screen.getAllByText(secondHypothesisStatement).length).toBeGreaterThan(0);
      expect(
        screen.getByText(/This will permanently delete this hypothesis and all its technical planning/i),
      ).toBeInTheDocument();
    });

    it('should require typing exact statement to enable delete', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisList />);

      await openDeleteDialogForSecondHypothesis(user);

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });

      expect(confirmDeleteButton).toBeDisabled();

      await user.type(confirmInput, secondHypothesisStatement);

      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });
    });

    it('should call deleteHypothesis and refresh list on successful delete', async () => {
      const user = userEvent.setup();
      mockHypoStageApi.deleteHypothesis.mockResolvedValue(undefined);
      await renderWithProviders(<HypothesisList />);

      await openDeleteDialogForSecondHypothesis(user);

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      await user.type(confirmInput, secondHypothesisStatement);

      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });

      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockHypoStageApi.deleteHypothesis).toHaveBeenCalledWith('hypothesis-2');
      });
    });

    it('should show error notification on delete failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to delete hypothesis';
      mockHypoStageApi.deleteHypothesis.mockRejectedValue(new Error(errorMessage));
      await renderWithProviders(<HypothesisList />);

      await openDeleteDialogForSecondHypothesis(user);

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      await user.type(confirmInput, secondHypothesisStatement);

      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });

      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisList />);

      const deleteButtons = screen.getAllByLabelText(/Delete hypothesis/i);
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete hypothesis?')).toBeInTheDocument();
      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete hypothesis?')).not.toBeInTheDocument();
      });
    });
  });
});
