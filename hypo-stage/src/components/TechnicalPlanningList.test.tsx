import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import type { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { HypoStageApiRef, PlanProposal } from '../api/HypoStageApi';
import { NotificationProvider } from '../providers/NotificationProvider';
import { TechnicalPlanningList } from './TechnicalPlanningList';

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
  reading: 'Act now.',
  warnings: [],
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
      rationale: 'r',
    },
  ],
};

const status = (plannerEnabled: boolean) => ({
  available: true,
  enabled: false,
  coach: { enabled: false, checkOnSave: false },
  planner: { enabled: plannerEnabled },
  issues: { triage: false, planIssues: false },
  coverage: { enabled: false },
});

describe('TechnicalPlanningList with the plan designer', () => {
  const api = {
    getAgentsStatus: jest.fn(),
    proposeTechnicalPlan: jest.fn().mockResolvedValue(proposal),
    decidePlanAction: jest.fn().mockResolvedValue(undefined),
    createTechnicalPlanning: jest.fn(),
    getEntityRefs: jest.fn().mockResolvedValue([]),
    getPlanningIssues: jest.fn().mockResolvedValue([]),
  };

  const render = () =>
    renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <NotificationProvider>
          <TechnicalPlanningList hypothesis={hypothesis} onRefresh={jest.fn()} />
        </NotificationProvider>
      </TestApiProvider>,
    );

  beforeEach(() => jest.clearAllMocks());

  it('hides the button when the planner is disabled', async () => {
    api.getAgentsStatus.mockResolvedValue(status(false));
    await render();
    await waitFor(() => expect(api.getAgentsStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Suggest plan with AI/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Technical Planning' })).toBeInTheDocument();
  });

  it('pre-fills the create form from a proposal', async () => {
    api.getAgentsStatus.mockResolvedValue(status(true));
    await render();
    await userEvent.click(await screen.findByRole('button', { name: /Suggest plan with AI/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit before adding' }));

    expect(await screen.findByDisplayValue('Project batch volume from last year of logs')).toBeInTheDocument();
    expect(screen.getByDisplayValue(proposal.actions[0].expectedOutcome)).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-10-12')).toBeInTheDocument();
  });
});
