import type { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import type { AgentSuggestion, HypoStageApi } from '../api/HypoStageApi';
import { applyAgentSuggestion } from './useApplyAgentSuggestion';

const PR_URL = 'https://github.com/acme/payments/pull/7';

const hypothesis = {
  id: 'h1',
  statement: 'The gateway handles 1000 requests per second on one node',
  status: 'Open',
  sourceType: 'Quality Attribute',
  entityRefs: ['component:default/payments'],
  relatedArtefacts: ['https://docs.example.com/adr-1'],
  qualityAttributes: ['Performance'],
  uncertainty: 'High',
  impact: 'High',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  technicalPlannings: [
    {
      id: 'tp1',
      entityRef: 'component:default/payments',
      actionType: 'Spike',
      description: 'Load test',
      expectedOutcome: 'Know max throughput',
      documentations: [],
      targetDate: new Date('2026-12-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
} as Hypothesis;

function suggestion(partial: Pick<AgentSuggestion, 'kind' | 'payload'> & Partial<AgentSuggestion>) {
  return {
    id: 's1',
    runId: 'r1',
    hypothesisId: 'h1',
    technicalPlanningId: null,
    rationale: 'r',
    evidence: [],
    confidence: 0.9,
    artifactRef: 'acme/payments#pull/7',
    artifactUrl: PR_URL,
    headSha: 'abc',
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  } as AgentSuggestion;
}

describe('applyAgentSuggestion', () => {
  let api: jest.Mocked<Pick<HypoStageApi, 'updateHypothesis' | 'updateTechnicalPlanning' | 'createTechnicalPlanning'>>;

  beforeEach(() => {
    api = {
      updateHypothesis: jest.fn(),
      updateTechnicalPlanning: jest.fn(),
      createTechnicalPlanning: jest.fn(),
    };
  });

  const apply = (s: AgentSuggestion, h: Hypothesis = hypothesis) =>
    applyAgentSuggestion(api as unknown as HypoStageApi, h, s);

  it('adds the PR url to related artefacts', async () => {
    await apply(suggestion({ kind: 'link', payload: { url: PR_URL } }));
    expect(api.updateHypothesis).toHaveBeenCalledWith('h1', expect.objectContaining({
      status: 'Open',
      relatedArtefacts: ['https://docs.example.com/adr-1', PR_URL],
    }));
  });

  it('is idempotent for links already present', async () => {
    await apply(suggestion({ kind: 'link', payload: { url: PR_URL } }), {
      ...hypothesis,
      relatedArtefacts: [PR_URL],
    });
    expect(api.updateHypothesis).not.toHaveBeenCalled();
  });

  it('records planning progress on the planning', async () => {
    await apply(
      suggestion({
        kind: 'planning_progress',
        technicalPlanningId: 'tp1',
        payload: { effect: 'completes', expectedOutcome: '1400 rps on one node' },
      }),
    );
    expect(api.updateTechnicalPlanning).toHaveBeenCalledWith('tp1', {
      expectedOutcome: '1400 rps on one node',
      documentations: [PR_URL],
    });
  });

  it('applies reassessments through the anchored planning', async () => {
    await apply(
      suggestion({
        kind: 'reassessment',
        technicalPlanningId: 'tp1',
        payload: { uncertainty: 'Low', impact: 'High', previous: { uncertainty: 'High', impact: 'High' } },
      }),
    );
    expect(api.updateTechnicalPlanning).toHaveBeenCalledWith('tp1', {
      expectedOutcome: 'Know max throughput',
      documentations: [PR_URL],
      uncertainty: 'Low',
      impact: 'High',
    });
    expect(api.updateHypothesis).not.toHaveBeenCalled();
  });

  it('fails when the anchored planning was deleted', async () => {
    await expect(
      apply(
        suggestion({
          kind: 'planning_progress',
          technicalPlanningId: 'gone',
          payload: { effect: 'advances', expectedOutcome: null },
        }),
      ),
    ).rejects.toThrow(/no longer exists/);
  });

  it('creates new technical plannings with the PR as documentation', async () => {
    await apply(
      suggestion({
        kind: 'new_planning',
        payload: {
          actionType: 'Modularization',
          entityRef: 'component:default/payments',
          description: 'Isolate the gateway client',
          expectedOutcome: 'Lower cost of replacing the gateway',
          targetDate: '2026-10-09',
          uncertainty: 'Medium',
          impact: 'High',
          previous: { uncertainty: 'High', impact: 'High' },
        },
      }),
    );
    expect(api.createTechnicalPlanning).toHaveBeenCalledWith('h1', {
      entityRef: 'component:default/payments',
      actionType: 'Modularization',
      description: 'Isolate the gateway client',
      expectedOutcome: 'Lower cost of replacing the gateway',
      documentations: [PR_URL],
      targetDate: '2026-10-09',
      uncertainty: 'Medium',
      impact: 'High',
    });
  });

  it('changes the hypothesis status', async () => {
    await apply(suggestion({ kind: 'status_change', payload: { status: 'Validated', previous: 'Open' } }));
    expect(api.updateHypothesis).toHaveBeenCalledWith('h1', expect.objectContaining({ status: 'Validated' }));
  });

  it('applies coach rewrites with the suggested source type and quality attributes', async () => {
    await apply(
      suggestion({
        kind: 'rewrite',
        artifactUrl: null,
        artifactRef: null,
        runId: null,
        payload: {
          statement: 'A single instance can sustain 1000 requests per second',
          previous: hypothesis.statement,
          sourceType: 'Requirements',
          addQualityAttributes: ['Scalability'],
        },
      }),
    );
    expect(api.updateHypothesis).toHaveBeenCalledWith('h1', expect.objectContaining({
      statement: 'A single instance can sustain 1000 requests per second',
      sourceType: 'Requirements',
      qualityAttributes: ['Performance', 'Scalability'],
      status: 'Open',
    }));
  });

  it('skips a rewrite that is already applied', async () => {
    await apply(
      suggestion({
        kind: 'rewrite',
        artifactUrl: null,
        payload: { statement: hypothesis.statement, previous: 'old', sourceType: null, addQualityAttributes: [] },
      }),
    );
    expect(api.updateHypothesis).not.toHaveBeenCalled();
  });
});
