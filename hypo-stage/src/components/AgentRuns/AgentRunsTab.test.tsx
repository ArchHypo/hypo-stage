import { default as React } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { AgentRunDetail, AgentRunSummary, HypoStageApiRef } from '../../api/HypoStageApi';
import { AgentRunsTab } from './AgentRunsTab';

const H1 = '11111111-1111-4111-8111-111111111111';

const completed: AgentRunSummary = {
  id: 'run-1',
  repository: 'acme/payments',
  prNumber: 3,
  headSha: 'abc',
  prUrl: 'https://github.com/acme/payments/pull/3',
  triggerAction: 'closed',
  modelKey: 'gemini-flash',
  provider: 'google',
  status: 'completed',
  error: null,
  startedAt: '2026-09-26T23:18:50.000Z',
  completedAt: '2026-09-26T23:19:04.000Z',
  suggestionCount: 0,
};

const failed: AgentRunSummary = {
  ...completed,
  id: 'run-2',
  prNumber: 4,
  status: 'failed',
  error: 'provider down',
  repository: 'acme/other',
};

const detail: AgentRunDetail = {
  ...completed,
  trace: {
    scope: 'repository',
    hypothesesInScope: 3,
    suggestions: 0,
    steps: [
      { step: 'context', durationMs: 900, details: { files: 1, merged: true } },
      {
        step: 'triage',
        durationMs: 2000,
        inputTokens: 700,
        outputTokens: 50,
        details: {
          returned: 2,
          selected: [{ id: H1, relevance: 1, reason: 'touches payments' }],
          dropped: [{ id: 'made-up', relevance: 0.9, reason: 'unknown hypothesis id' }],
        },
      },
      {
        step: 'assess',
        durationMs: 3000,
        inputTokens: 1200,
        outputTokens: 100,
        details: {
          hypothesisId: H1,
          model: {
            related: true,
            confidence: 0.8,
            reassessment: null,
            planningProgress: [],
            newPlanning: null,
            statusChange: null,
          },
          kept: [],
          dropped: [{ kind: 'link', reason: 'PR is already a related artefact' }],
        },
      },
    ],
  },
  suggestions: [],
};

describe('AgentRunsTab', () => {
  const api = {
    getHypotheses: jest.fn(),
    getAgentRuns: jest.fn(),
    getAgentRun: jest.fn(),
  };

  const render = (enabled = true) =>
    renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <AgentRunsTab enabled={enabled} />
      </TestApiProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    api.getHypotheses.mockResolvedValue([{ id: H1, statement: 'Payments behind an adapter' }]);
    api.getAgentRuns.mockResolvedValue({
      items: [completed, failed],
      total: 2,
      repositories: ['acme/other', 'acme/payments'],
    });
    api.getAgentRun.mockImplementation(async (id: string) =>
      id === 'run-1' ? detail : { ...failed, trace: { steps: [] }, suggestions: [] },
    );
  });

  it('lists runs', async () => {
    await render();

    expect(await screen.findByText('#3')).toHaveAttribute('href', completed.prUrl);
    expect(screen.getAllByText('gemini-flash · google')).toHaveLength(2);
    expect(screen.getAllByText('14.0 s')).toHaveLength(2);
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(api.getAgentRuns).toHaveBeenCalledWith({ limit: 25, offset: 0, repository: undefined, status: undefined });
  });

  it('filters by repository and status', async () => {
    const user = userEvent.setup();
    await render();
    await screen.findByText('#3');

    await user.click(screen.getByLabelText('Repository'));
    await user.click(within(screen.getByRole('listbox')).getByText('acme/payments'));
    await waitFor(() =>
      expect(api.getAgentRuns).toHaveBeenLastCalledWith(expect.objectContaining({ repository: 'acme/payments' })),
    );

    await user.click(screen.getByLabelText('Status'));
    await user.click(within(screen.getByRole('listbox')).getByText('failed'));
    await waitFor(() =>
      expect(api.getAgentRuns).toHaveBeenLastCalledWith(
        expect.objectContaining({ repository: 'acme/payments', status: 'failed', offset: 0 }),
      ),
    );
  });

  it('shows the trace with dropped candidates and proposals', async () => {
    const user = userEvent.setup();
    await render();

    await screen.findByText('#3');
    await user.click(screen.getByText('acme/payments'));
    const panel = await screen.findByTestId('agent-run-details-run-1');

    expect(within(panel).getAllByText('Payments behind an adapter').length).toBeGreaterThan(0);
    expect(within(panel).getByText(/dropped: unknown hypothesis id/)).toBeInTheDocument();
    expect(within(panel).getByText('made-up')).toBeInTheDocument();
    expect(within(panel).getByText(/link dropped: PR is already a related artefact/)).toBeInTheDocument();
    expect(within(panel).getByText(/Tokens: 2050/)).toBeInTheDocument();
  });

  it('shows the error of failed runs', async () => {
    const user = userEvent.setup();
    await render();

    await screen.findByText('#4');
    await user.click(screen.getByText('acme/other'));
    const panel = await screen.findByTestId('agent-run-details-run-2');
    expect(within(panel).getByText('provider down')).toBeInTheDocument();
  });

  it('explains when agents are disabled', async () => {
    await render(false);
    expect(await screen.findByText(/Agents are disabled in config/)).toBeInTheDocument();
  });

  it('renders issue triage runs without PR-only fields', async () => {
    const issueRun = { ...completed, id: 'run-3', prNumber: 12, artifactKind: 'issue' as const, handler: 'issue_triage' as const, repository: 'acme/issues' };
    api.getAgentRuns.mockResolvedValue({ items: [issueRun], total: 1, repositories: ['acme/issues'] });
    api.getAgentRun.mockResolvedValue({
      ...issueRun,
      suggestions: [],
      trace: {
        scope: 'repository',
        hypothesesInScope: 2,
        steps: [
          { step: 'context', durationMs: 5, details: { state: 'open', comments: 2, reopened: 0 } },
          { step: 'triage', durationMs: 5, details: { classification: 'bug', qualityAttributes: ['Performance'], selected: [], dropped: [] } },
          { step: 'assess', durationMs: 5, details: { hypothesisId: H1, model: { related: true, confidence: 0.9, evidenceType: 'contradicts' }, kept: ['link'], dropped: [] } },
        ],
      },
    });
    const user = userEvent.setup();
    await render();
    await screen.findByText('acme/issues');
    await user.click(screen.getByText('acme/issues'));
    const panel = await screen.findByTestId('agent-run-details-run-3');

    expect(within(panel).getByText(/Issue state: open · Comments: 2 · Reopened: 0/)).toBeInTheDocument();
    expect(within(panel).queryByText(/Merged/)).not.toBeInTheDocument();
    expect(within(panel).getByText('Triage (0 returned by the model)')).toBeInTheDocument();
    expect(within(panel).getByText(/Classified as bug · Performance/)).toBeInTheDocument();
    expect(within(panel).getByText(/evidence: contradicts/)).toBeInTheDocument();
  });
});
