import { default as React } from 'react';
import { act, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { HypothesisPage } from './HypothesisPage';
import { useHypothesisData } from '../hooks/useHypothesisData';
import { useNavigate, useParams } from 'react-router-dom';
import { NotificationProvider } from '../providers/NotificationProvider';

// Mock the hooks
jest.mock('../hooks/useHypothesisData');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

const mockUseHypothesisData = useHypothesisData as jest.MockedFunction<typeof useHypothesisData>;
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const longStatement = 'This is a test hypothesis statement that must be typed exactly';
const mockHypothesis = {
  id: 'test-hypothesis-id',
  statement: longStatement,
  status: 'Open' as const,
  sourceType: 'Requirements' as const,
  entityRefs: ['component:default/my-service'],
  relatedArtefacts: [],
  qualityAttributes: ['Performance' as const],
  uncertainty: 'Medium' as const,
  impact: 'High' as const,
  technicalPlannings: [],
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCreateHypothesisInput = {
  statement: 'This is a test hypothesis statement that must be typed exactly',
  sourceType: 'Requirements' as const,
  entityRefs: ['component:default/my-service'],
  relatedArtefacts: [],
  qualityAttributes: ['Performance' as const],
  uncertainty: 'Medium' as const,
  impact: 'High' as const,
  notes: null,
};

const mockEvents = [
  {
    id: 'event-1',
    hypothesisId: 'test-hypothesis-id',
    eventType: 'CREATE' as const,
    timestamp: new Date('2024-01-01'),
    changes: mockCreateHypothesisInput,
  },
];

const mockHypoStageApi = {
  getEntityRefs: jest.fn(),
  createHypothesis: jest.fn(),
  getHypotheses: jest.fn(),
  updateHypothesis: jest.fn(),
  getEvents: jest.fn(),
  deleteHypothesis: jest.fn(),
  createTechnicalPlanning: jest.fn(),
  updateTechnicalPlanning: jest.fn(),
  deleteTechnicalPlanning: jest.fn(),
};

const renderWithProviders = async (ui: React.ReactElement) => {
  const mockNavigate = jest.fn();
  mockUseNavigate.mockReturnValue(mockNavigate);
  mockUseParams.mockReturnValue({ hypothesisId: 'test-hypothesis-id' });

  return {
    ...(await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, mockHypoStageApi]]}>
        <NotificationProvider>{ui}</NotificationProvider>
      </TestApiProvider>,
    )),
    mockNavigate,
  };
};

describe('HypothesisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHypothesisData.mockReturnValue({
      hypothesis: mockHypothesis,
      events: mockEvents,
      loading: false,
      error: null,
      refreshHypothesis: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it('should render hypothesis details', async () => {
    await renderWithProviders(<HypothesisPage />);

    expect(screen.getByText('Hypothesis Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/test-hypothesis-id/)).toBeInTheDocument();
    expect(screen.getByText(/This is a test hypothesis statement that must be typed exactly/)).toBeInTheDocument();
  });

  it('should render action bar with Back, Edit, and Delete buttons for responsive layout', async () => {
    await renderWithProviders(<HypothesisPage />);

    const actionBar = screen.getByTestId('hypothesis-action-bar');
    expect(actionBar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to List/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Hypothesis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    mockUseHypothesisData.mockReturnValue({
      hypothesis: null,
      events: [],
      loading: true,
      error: null,
      refreshHypothesis: jest.fn(),
      refetch: jest.fn(),
    });

    await renderWithProviders(<HypothesisPage />);
    expect(screen.queryByText(/Hypothesis Dashboard/i)).not.toBeInTheDocument();
  });

  it('should show error state', async () => {
    mockUseHypothesisData.mockReturnValue({
      hypothesis: null,
      events: [],
      loading: false,
      error: new Error('Not found'),
      refreshHypothesis: jest.fn(),
      refetch: jest.fn(),
    });

    await renderWithProviders(<HypothesisPage />);
    expect(screen.getAllByText(/Not found/i).length).toBeGreaterThan(0);
  });

  describe('Delete functionality', () => {
    it('should open delete dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      expect(screen.getByText('Delete hypothesis?')).toBeInTheDocument();
      expect(
        screen.getByText(/This will permanently delete this hypothesis and all its technical planning/i),
      ).toBeInTheDocument();
    });

    it('should show confirmation input and reference text in delete dialog', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      const input = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      expect(input).toBeInTheDocument();

      const referenceText = screen.getByText(/Reference — type this exactly:/i);
      expect(referenceText).toBeInTheDocument();
      expect(screen.getAllByText(mockHypothesis.statement).length).toBeGreaterThan(0);
    });

    it(
      'should disable delete button until exact statement is typed',
      async () => {
        const shortStatement = 'Short';
        mockUseHypothesisData.mockReturnValue({
          hypothesis: { ...mockHypothesis, statement: shortStatement },
          events: mockEvents,
          loading: false,
          error: null,
          refreshHypothesis: jest.fn(),
          refetch: jest.fn(),
        });
        const user = userEvent.setup({ delay: null });
        await renderWithProviders(<HypothesisPage />);

        const deleteButton = await screen.findByRole('button', { name: /delete/i });
        await act(async () => {
          await user.click(deleteButton);
        });

        const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
        const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });

        expect(confirmDeleteButton).toBeDisabled();

        fireEvent.change(confirmInput, { target: { value: 'Sh' } });
        expect(confirmDeleteButton).toBeDisabled();

        fireEvent.change(confirmInput, { target: { value: shortStatement } });
        await waitFor(() => {
          expect(confirmDeleteButton).not.toBeDisabled();
        });
      },
      10000,
    );

    it('should call deleteHypothesis and navigate on successful delete', async () => {
      const user = userEvent.setup({ delay: null });
      mockHypoStageApi.deleteHypothesis.mockResolvedValue(undefined);
      const { mockNavigate } = await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      fireEvent.change(confirmInput, { target: { value: mockHypothesis.statement } });

      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });

      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockHypoStageApi.deleteHypothesis).toHaveBeenCalledWith('test-hypothesis-id');
        expect(mockNavigate).toHaveBeenCalledWith('/hypo-stage');
      });
    });

    it('should show error notification on delete failure', async () => {
      const user = userEvent.setup({ delay: null });
      const errorMessage = 'Failed to delete hypothesis';
      mockHypoStageApi.deleteHypothesis.mockRejectedValue(new Error(errorMessage));
      await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      fireEvent.change(confirmInput, { target: { value: mockHypothesis.statement } });

      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });

      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should close dialog and reset input on cancel', async () => {
      const user = userEvent.setup();
      await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete hypothesis?')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during delete', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockHypoStageApi.deleteHypothesis.mockReturnValue(deletePromise);
      await renderWithProviders(<HypothesisPage />);

      const deleteButton = await screen.findByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      const confirmInput = screen.getByPlaceholderText(/Type the hypothesis name here/i);
      fireEvent.change(confirmInput, { target: { value: mockHypothesis.statement } });

      const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      await waitFor(() => {
        expect(confirmDeleteButton).not.toBeDisabled();
      });

      await user.click(confirmDeleteButton);

      // Should show "Deleting…" text
      expect(screen.getByText(/Deleting…/i)).toBeInTheDocument();
      expect(confirmDeleteButton).toBeDisabled();

      resolveDelete!();
      await waitFor(() => {
        expect(mockHypoStageApi.deleteHypothesis).toHaveBeenCalled();
      });
    });
  });
});
