import type { HypothesisRecord } from '../domain/archhypo';
import { composeExpectedOutcome, guardPlan } from './guardrails';
import type { PlanProposalOutput } from './schemas';
import { strategyProfile } from './strategy';

const today = new Date('2026-09-28T12:00:00Z');

const hypothesis: HypothesisRecord = {
  id: 'h1',
  statement: 'It is possible to process batches of 1Gb per minute using just one server',
  status: 'Open',
  sourceType: 'Quality Attribute',
  uncertainty: 'High',
  impact: 'High',
  entityRefs: ['component:default/batch', 'component:default/ingest'],
  qualityAttributes: ['Performance'],
  relatedArtefacts: [],
  notes: null,
  technicalPlannings: [
    {
      id: 'tp1',
      hypothesisId: 'h1',
      entityRef: 'component:default/batch',
      actionType: 'Spike',
      description: 'Benchmark the batch parser',
      expectedOutcome: 'Know parser throughput',
      documentations: [],
      targetDate: '2026-10-10',
    },
  ],
  recentEvents: [],
};

type Action = PlanProposalOutput['actions'][number];
const action = (overrides: Partial<Action> = {}): Action => ({
  actionType: 'Analytics',
  goal: 'reduce_uncertainty',
  description: 'Project batch volume growth from last year of ingestion logs',
  evidence: 'If projected peak stays under 1Gb/min on one server, uncertainty drops to Low',
  expectedEffect: { uncertainty: 'Low', impact: null },
  iteration: 1,
  entityRef: 'component:default/ingest',
  rationale: 'Cheap information first',
  ...overrides,
});

const run = (actions: Action[], maxActions = 4) =>
  guardPlan(hypothesis, { reading: 'High/High: act now.', actions }, strategyProfile('High', 'High'), {
    maxActions,
    iterationDays: 14,
    today,
  });

describe('guardPlan', () => {
  it('produces backend-ready actions with the goal in the expected outcome', () => {
    const [a] = run([action()]).actions;
    expect(a).toMatchObject({
      actionType: 'Analytics',
      goal: 'reduce_uncertainty',
      entityRef: 'component:default/ingest',
      targetDate: '2026-10-12',
      expectedEffect: { uncertainty: 'Low', impact: null },
    });
    expect(a.expectedOutcome).toBe(
      'Goal: Reduce uncertainty. Evidence: If projected peak stays under 1Gb/min on one server, uncertainty drops to Low. Expected effect: uncertainty High → Low.',
    );
  });

  it('falls back to the first entity ref and clamps iterations', () => {
    const [a] = run([action({ entityRef: 'component:default/unknown', iteration: 40 })]).actions;
    expect(a.entityRef).toBe('component:default/batch');
    expect(a.iteration).toBe(6);
    expect(a.targetDate).toBe('2026-12-21');
  });

  it('keeps the expected outcome within 500 characters by shortening the evidence', () => {
    const [a] = run([action({ evidence: 'x'.repeat(900) })]).actions;
    expect(a.expectedOutcome.length).toBeLessThanOrEqual(500);
    expect(a.expectedOutcome.startsWith('Goal: Reduce uncertainty. Evidence: ')).toBe(true);
    expect(a.expectedOutcome.endsWith('Expected effect: uncertainty High → Low.')).toBe(true);
  });

  it('only lowers levels the goal can move', () => {
    const [raise, mismatch] = run([
      action({ expectedEffect: { uncertainty: 'Very High', impact: null } }),
      action({
        description: 'Isolate the batch parser behind an interface',
        goal: 'reduce_impact',
        actionType: 'Modularization',
        expectedEffect: { uncertainty: 'Low', impact: 'Medium' },
      }),
    ]).actions;
    expect(raise.expectedEffect).toEqual({ uncertainty: null, impact: null });
    expect(raise.expectedOutcome).toMatch(/Expected effect: levels unchanged\.$/);
    expect(mismatch.expectedEffect).toEqual({ uncertainty: null, impact: 'Medium' });
  });

  it('drops invalid, duplicate and excess actions', () => {
    const { actions } = run(
      [
        action({ actionType: 'Magic' as any }),
        action({ goal: 'win' as any }),
        action({ description: 'benchmark the  batch PARSER' }), // existing planning
        action(),
        action(), // duplicate proposal
        action({ description: 'Second', actionType: 'Guideline' }),
        action({ description: 'Third', actionType: 'Trigger', goal: 'define_postponement_criteria' }),
      ],
      2,
    );
    expect(actions.map(a => a.description)).toEqual([
      'Project batch volume growth from last year of ingestion logs',
      'Second',
    ]);
  });

  it('warns when the profile requirement is not met, when only spikes are proposed, or when nothing is usable', () => {
    const late = run([action({ iteration: 3 })]);
    expect(late.warnings[0]).toMatch(/by iteration 1/);

    const spikes = run(
      ['A', 'B', 'C'].map(d => action({ description: `Spike ${d}`, actionType: 'Spike' })),
    );
    expect(spikes.warnings).toEqual([
      'All proposals are Spikes; consider Guidelines or other actions as well.',
    ]);

    expect(run([]).warnings[0]).toMatch(/did not propose any usable action/);
  });
});

describe('composeExpectedOutcome', () => {
  it('lists both level effects', () => {
    expect(
      composeExpectedOutcome('accept_or_refute', 'Load test passes.', { uncertainty: 'Very Low', impact: 'Low' }, { uncertainty: 'High', impact: 'High' }),
    ).toBe('Goal: Accept or refute. Evidence: Load test passes. Expected effect: uncertainty High → Very Low; impact High → Low.');
  });
});
