import { default as React } from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import type { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { AgentSuggestion, HypoStageApiRef } from '../../../api/HypoStageApi';
import { NotificationProvider } from '../../../providers/NotificationProvider';
import { AgentSuggestionsCard } from './AgentSuggestionsCard';

const PR_URL = 'https://github.com/acme/payments/pull/7';

const hypothesis = {
  id: 'h1',
  statement: 'The gateway handles 1000 requests per second on one node',
  status: 'Open',
  sourceType: 'Quality Attribute',
  entityRefs: ['component:default/payments'],
  relatedArtefacts: [],
  qualityAttributes: ['Performance'],
  uncertainty: 'High',
  impact: 'High',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  technicalPlannings: [],
} as unknown as Hypothesis;

const suggestion = {
  id: 's1',
  runId: 'r1',
  hypothesisId: 'h1',
  technicalPlanningId: null,
  kind: 'status_change',
  payload: { status: 'Validated', previous: 'Open' },
  rationale: 'The load test shows 1400 rps on one node.',
  evidence: [{ file: 'load/gateway.k6.js', note: 'load test' }],
  confidence: 0.82,
  sources: [],
  artifactRef: 'acme/payments#pull/7',
  artifactUrl: PR_URL,
  headSha: 'abc',
  status: 'pending',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '',
  updatedAt: '',
} as AgentSuggestion;

describe('AgentSuggestionsCard', () => {
  const api = {
    getAgentSuggestions: jest.fn(),
    getAgentsStatus: jest.fn().mockResolvedValue({
      available: true,
      enabled: true,
      coach: { enabled: false, checkOnSave: false },
      planner: { enabled: true },
      issues: { triage: true, planIssues: false },
      coverage: { enabled: false },
    }),
    proposeTechnicalPlan: jest.fn(),
    reviewAgentSuggestion: jest.fn().mockResolvedValue({}),
    updateHypothesis: jest.fn().mockResolvedValue({}),
    updateTechnicalPlanning: jest.fn(),
    createTechnicalPlanning: jest.fn(),
  };

  const render = (onReviewed = jest.fn()) =>
    renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <NotificationProvider>
          <AgentSuggestionsCard hypothesis={hypothesis} onReviewed={onReviewed} />
        </NotificationProvider>
      </TestApiProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    api.getAgentSuggestions.mockResolvedValueOnce([suggestion]).mockResolvedValue([]);
  });

  it('shows pending suggestions grouped by pull request', async () => {
    await render();
    expect(await screen.findByText('acme/payments#7')).toHaveAttribute('href', PR_URL);
    expect(screen.getByText('Status change')).toBeInTheDocument();
    expect(screen.getByText('82% confidence')).toBeInTheDocument();
    expect(screen.getByText('Status Open → Validated')).toBeInTheDocument();
    expect(screen.getByText(/load\/gateway.k6.js/)).toBeInTheDocument();
    expect(api.getAgentSuggestions).toHaveBeenCalledWith('h1', 'pending');
  });

  it('applies through the hypothesis API before marking accepted', async () => {
    const onReviewed = jest.fn();
    await render(onReviewed);
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(onReviewed).toHaveBeenCalled());
    expect(api.updateHypothesis).toHaveBeenCalledWith('h1', expect.objectContaining({ status: 'Validated' }));
    expect(api.reviewAgentSuggestion).toHaveBeenCalledWith('s1', 'accepted');
    expect(api.updateHypothesis.mock.invocationCallOrder[0]).toBeLessThan(
      api.reviewAgentSuggestion.mock.invocationCallOrder[0],
    );
    expect(await screen.findByText('No pending agent suggestions')).toBeInTheDocument();
  });

  it('rejects without touching the hypothesis', async () => {
    await render();
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.reviewAgentSuggestion).toHaveBeenCalledWith('s1', 'rejected'));
    expect(api.updateHypothesis).not.toHaveBeenCalled();
  });

  it('groups coach rewrites under "Hypothesis coach"', async () => {
    api.getAgentSuggestions.mockReset();
    api.getAgentSuggestions.mockResolvedValue([
      {
        ...suggestion,
        id: 's2',
        kind: 'rewrite',
        runId: null,
        artifactRef: null,
        artifactUrl: null,
        payload: {
          statement: 'A single instance can sustain 1000 requests per second',
          previous: hypothesis.statement,
          sourceType: null,
          addQualityAttributes: ['Scalability'],
        },
      },
    ]);
    await render();
    expect(await screen.findByText('Hypothesis coach')).toBeInTheDocument();
    expect(screen.getByText('Statement rewrite')).toBeInTheDocument();
    expect(screen.getByText(/Proposed: A single instance can sustain/)).toBeInTheDocument();
    expect(screen.getByText(/Add quality attributes: Scalability/)).toBeInTheDocument();
  });

  it('shows evidence alerts with Acknowledge, every source, and a plan shortcut for fired Triggers', async () => {
    api.getAgentSuggestions.mockReset();
    api.getAgentSuggestions.mockResolvedValue([
      {
        ...suggestion,
        id: 'alert',
        kind: 'evidence_alert',
        artifactRef: 'acme/payments#issue/12',
        artifactUrl: 'https://github.com/acme/payments/issues/12',
        payload: {
          evidenceType: 'contradicts',
          issues: ['https://github.com/acme/payments/issues/12', 'https://github.com/acme/payments/issues/13'],
        },
      },
      {
        ...suggestion,
        id: 'trigger',
        kind: 'status_change',
        artifactRef: 'acme/payments#issue/12',
        artifactUrl: 'https://github.com/acme/payments/issues/12',
        payload: { status: 'Trigger-Fired', previous: 'Open' },
        sources: [
          { artifactRef: 'acme/payments#issue/12', url: 'https://github.com/acme/payments/issues/12', kind: 'issue' },
          { artifactRef: 'acme/payments#pull/9', url: 'https://github.com/acme/payments/pull/9', kind: 'pull_request' },
        ],
      },
    ]);
    await render();
    expect(await screen.findByText('Evidence alert')).toBeInTheDocument();
    expect(screen.getByText(/suggest this uncertainty is materializing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
    expect(screen.getByText('acme/payments#9')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Suggest plan with AI' })).toBeInTheDocument();
  });

  it('names issues correctly and reports a plan issue closed on completion', async () => {
    api.getAgentSuggestions.mockReset();
    api.getAgentSuggestions
      .mockResolvedValueOnce([
        { ...suggestion, id: 'l1', kind: 'link', payload: { url: 'u' }, artifactRef: 'acme/payments#issue/12', artifactUrl: 'https://github.com/acme/payments/issues/12' },
      ])
      .mockResolvedValue([]);
    api.reviewAgentSuggestion.mockResolvedValueOnce({ issueClose: { number: 4, closed: true } });
    await render();
    expect(await screen.findByText('Add this issue to the related artefacts.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText(/plan issue #4 closed/)).toBeInTheDocument();
  });
});
