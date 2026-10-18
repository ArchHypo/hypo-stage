import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HypoStageApiRef, IssuesReport } from '../../api/HypoStageApi';
import { IssuesReportTab } from './IssuesReportTab';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const report: IssuesReport = {
  period: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
  repository: null,
  reported: {
    total: 4,
    byClassification: { bug: 3, improvement: 1 },
    byQualityAttribute: { Performance: 3, Usability: 1 },
    related: 1,
    unrelated: 3,
    byHypothesis: [{ hypothesisId: 'h1', statement: 'One server handles 1000 rps', issues: 1, evidence: { contradicts: 1 } }],
    resolution: { closed: 3, open: 1, medianDaysToClose: 2, sameDayPercent: 33 },
  },
  planIssues: { total: 2, byActionType: { Guideline: 2 }, byMonth: { '2026-09': 2 }, open: 1, completed: 1, notPlanned: 0, medianDaysToClose: 4 },
  uncovered: [
    {
      id: 'f1',
      createdAt: '',
      repository: 'acme/payments',
      entityRef: 'component:default/checkout',
      qualityAttribute: 'Performance',
      windowDays: 30,
      issues: ['u1', 'u2', 'u3'],
      impactProxy: { issues: 3, medianOpenDays: 5, reopened: 1, avgComments: 2 },
      theme: 'Checkout latency under load',
      draftStatement: 'The checkout keeps p95 under 300 ms at peak load',
      review: null,
      status: 'pending',
    },
  ],
};

describe('IssuesReportTab', () => {
  const api = {
    getIssuesReport: jest.fn().mockResolvedValue(report),
    getIssuesReportMarkdown: jest.fn().mockResolvedValue('# Issues report'),
    updateCoverageFinding: jest.fn().mockResolvedValue(undefined),
  };
  const render = () =>
    renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <IssuesReportTab />
      </TestApiProvider>,
    );

  beforeEach(() => jest.clearAllMocks());

  it('renders the summary', async () => {
    await render();
    expect(await screen.findByText('1 (25%)')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('One server handles 1000 rps')).toBeInTheDocument();
    expect(screen.getByText('Guideline')).toBeInTheDocument();
    expect(screen.getByText('Checkout latency under load')).toBeInTheDocument();
  });

  it('creates a hypothesis from an uncovered theme with a pre-filled form', async () => {
    await render();
    await userEvent.click(await screen.findByRole('button', { name: 'Create hypothesis' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(api.updateCoverageFinding).toHaveBeenCalledWith('f1', 'created');
    const url = new URL(`http://x${mockNavigate.mock.calls[0][0]}`);
    expect(url.pathname).toBe('/hypo-stage/create-hypothesis');
    expect(url.searchParams.get('statement')).toBe('The checkout keeps p95 under 300 ms at peak load');
    expect(url.searchParams.getAll('entityRef')).toEqual(['component:default/checkout']);
    expect(url.searchParams.getAll('qualityAttribute')).toEqual(['Performance']);
  });

  it('dismisses findings and reloads', async () => {
    await render();
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(api.updateCoverageFinding).toHaveBeenCalledWith('f1', 'dismissed'));
    expect(api.getIssuesReport).toHaveBeenCalledTimes(2);
  });

  it('offers the last 24 hours and 7 days', async () => {
    await render();
    await screen.findByText('1 (25%)');
    await userEvent.click(screen.getByLabelText('Period'));
    await userEvent.click(await screen.findByText('Last 24 hours'));
    await waitFor(() => expect(api.getIssuesReport).toHaveBeenCalledTimes(2));
    const { from, to } = api.getIssuesReport.mock.calls[1][0];
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(24 * 3_600_000);
    await userEvent.click(screen.getByLabelText('Period'));
    expect(await screen.findByText('Last 7 days')).toBeInTheDocument();
  });
});
