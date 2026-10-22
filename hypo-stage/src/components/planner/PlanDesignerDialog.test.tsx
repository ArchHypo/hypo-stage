import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import type { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { HypoStageApiRef, PlanProposal } from '../../api/HypoStageApi';
import { NotificationProvider } from '../../providers/NotificationProvider';
import { PlanDesignerDialog } from './PlanDesignerDialog';

const hypothesis = {
  id: 'h1',
  statement: 'It is possible to process batches of 1Gb per minute using just one server',
  status: 'Open',
  sourceType: 'Quality Attribute',
  entityRefs: ['component:default/batch'],
  relatedArtefacts: [],
  qualityAttributes: ['Performance'],
  uncertainty: 'High',
  impact: 'High',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  technicalPlannings: [],
} as unknown as Hypothesis;

const proposal: PlanProposal = {
  proposalId: 'p1',
  hypothesisId: 'h1',
  profile: 'act_now',
  reading: 'High uncertainty and impact: handle it in the first iteration.',
  warnings: ['All proposals are Spikes; consider Guidelines or other actions as well.'],
  actions: [
    {
      actionType: 'Analytics',
      goal: 'reduce_uncertainty',
      entityRef: 'component:default/batch',
      description: 'Project batch volume from last year of logs',
      expectedOutcome: 'Goal: Reduce uncertainty. Evidence: peak < 1Gb/min. Expected effect: uncertainty High → Low.',
      evidence: 'peak < 1Gb/min',
      expectedEffect: { uncertainty: 'Low', impact: null },
      iteration: 1,
      targetDate: '2026-10-12',
      rationale: 'Cheap information first',
    },
    {
      actionType: 'Modularization',
      goal: 'reduce_impact',
      entityRef: 'component:default/batch',
      description: 'Isolate the batch processor so it can be distributed later',
      expectedOutcome: 'Goal: Reduce impact. Evidence: processor behind an interface. Expected effect: impact High → Medium.',
      evidence: 'processor behind an interface',
      expectedEffect: { uncertainty: null, impact: 'Medium' },
      iteration: 1,
      targetDate: '2026-10-12',
      rationale: 'Parallel impact reduction',
    },
  ],
};

describe('PlanDesignerDialog', () => {
  const api = {
    proposeTechnicalPlan: jest.fn(),
    decidePlanAction: jest.fn().mockResolvedValue(undefined),
    createTechnicalPlanning: jest.fn().mockResolvedValue({ id: 'tp-new' }),
  };

  const render = async (props: Partial<React.ComponentProps<typeof PlanDesignerDialog>> = {}) => {
    const handlers = { onClose: jest.fn(), onAdded: jest.fn(), onEditBeforeAdding: jest.fn() };
    const result = await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <NotificationProvider>
          <PlanDesignerDialog open hypothesis={hypothesis} {...handlers} {...props} />
        </NotificationProvider>
      </TestApiProvider>,
    );
    return { result, handlers };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.proposeTechnicalPlan.mockResolvedValue(proposal);
  });

  it('shows the strategy, warnings and proposed actions', async () => {
    await render();
    expect(await screen.findByText(/Act in the first iteration/)).toBeInTheDocument();
    expect(screen.getByText(proposal.reading)).toBeInTheDocument();
    expect(screen.getByText(/All proposals are Spikes/)).toBeInTheDocument();
    expect(screen.getByText('Project batch volume from last year of logs')).toBeInTheDocument();
    expect(screen.getByText('Reduce impact')).toBeInTheDocument();
    expect(api.proposeTechnicalPlan).toHaveBeenCalledWith('h1');
  });

  it('adds an action as a technical planning and records the decision', async () => {
    const { handlers } = await render();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add' }))[0]);

    await waitFor(() => expect(handlers.onAdded).toHaveBeenCalled());
    expect(api.createTechnicalPlanning).toHaveBeenCalledWith('h1', {
      entityRef: 'component:default/batch',
      actionType: 'Analytics',
      description: 'Project batch volume from last year of logs',
      expectedOutcome: proposal.actions[0].expectedOutcome,
      documentations: [],
      targetDate: '2026-10-12',
    });
    expect(api.decidePlanAction).toHaveBeenCalledWith('p1', 0, 'added', 'tp-new');
    expect(screen.getByText('Added to the plan')).toBeInTheDocument();
  });

  it('dismisses and hands actions to the create form', async () => {
    const { handlers } = await render();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Dismiss' }))[1]);
    expect(api.decidePlanAction).toHaveBeenCalledWith('p1', 1, 'dismissed', undefined);
    expect(screen.getByText('Dismissed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit before adding' }));
    expect(handlers.onEditBeforeAdding).toHaveBeenCalledWith(proposal.actions[0], 'p1', 0);
  });

  it('shows errors with a retry', async () => {
    api.proposeTechnicalPlan.mockRejectedValueOnce(new Error('The plan designer took too long to answer'));
    await render();
    expect(await screen.findByText('The plan designer took too long to answer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Project batch volume from last year of logs')).toBeInTheDocument();
  });
});
