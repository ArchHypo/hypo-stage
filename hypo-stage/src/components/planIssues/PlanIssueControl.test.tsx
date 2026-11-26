import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import type { TechnicalPlanning } from '@archhypo/plugin-hypo-stage-backend';
import { HypoStageApiRef, RepositoryChoiceRequiredError } from '../../api/HypoStageApi';
import { NotificationProvider } from '../../providers/NotificationProvider';
import { PlanIssueControl } from './PlanIssueControl';

const planning = {
  id: 'tp1',
  entityRef: 'component:default/payments',
  actionType: 'Spike',
  description: 'Load test',
  expectedOutcome: 'Goal: Reduce uncertainty. Evidence: 1000 rps.',
  documentations: ['https://wiki/adr-1'],
  targetDate: new Date('2026-10-12'),
} as unknown as TechnicalPlanning;

const created = {
  technicalPlanningId: 'tp1',
  hypothesisId: 'h1',
  repository: 'acme/payments',
  issueNumber: 4,
  issueUrl: 'https://github.com/acme/payments/issues/4',
  state: 'open' as const,
  stateReason: null,
  createdAt: '',
  closedAt: null,
};

describe('PlanIssueControl', () => {
  const api = {
    openPlanningIssue: jest.fn(),
    updateTechnicalPlanning: jest.fn().mockResolvedValue({}),
  };
  const render = (link: any = null, onOpened = jest.fn()) =>
    renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <NotificationProvider>
          <PlanIssueControl technicalPlanning={planning} link={link} onOpened={onOpened} />
        </NotificationProvider>
      </TestApiProvider>,
    );

  beforeEach(() => jest.clearAllMocks());

  it('opens the issue and records it in the planning documentations', async () => {
    api.openPlanningIssue.mockResolvedValue(created);
    const onOpened = jest.fn();
    await render(null, onOpened);
    await userEvent.click(screen.getByRole('button', { name: /Open as issue/ }));
    await waitFor(() => expect(onOpened).toHaveBeenCalled());
    expect(api.updateTechnicalPlanning).toHaveBeenCalledWith('tp1', {
      expectedOutcome: planning.expectedOutcome,
      documentations: ['https://wiki/adr-1', created.issueUrl],
    });
  });

  it('asks for the repository when the component has none', async () => {
    api.openPlanningIssue
      .mockRejectedValueOnce(new RepositoryChoiceRequiredError(['acme/payments', 'acme/infra']))
      .mockResolvedValueOnce(created);
    await render();
    await userEvent.click(screen.getByRole('button', { name: /Open as issue/ }));
    expect(await screen.findByText('Where should the issue be opened?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open issue' }));
    await waitFor(() => expect(api.openPlanningIssue).toHaveBeenLastCalledWith('tp1', 'acme/payments'));
  });

  it('shows the linked issue state', async () => {
    await render({ ...created, state: 'closed', stateReason: 'completed' });
    expect(screen.getByText('#4 · completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open as issue/ })).not.toBeInTheDocument();
  });
});
