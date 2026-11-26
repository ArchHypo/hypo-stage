import type { HypothesisRecord } from '../domain/archhypo';
import { applyGuardrails, clampText, normalizeTargetDate, preserveGoalPrefix } from './guardrails';
import type { AssessmentOutput } from './schemas';

const PR_URL = 'https://github.com/acme/payments/pull/7';
const today = new Date('2026-09-25T12:00:00Z');

const hypothesis: HypothesisRecord = {
  id: 'h1',
  statement: 'The gateway handles 1000 rps on one node',
  status: 'Open',
  sourceType: 'Quality Attribute',
  uncertainty: 'High',
  impact: 'High',
  entityRefs: ['component:default/payments'],
  qualityAttributes: ['Performance'],
  relatedArtefacts: [],
  notes: null,
  technicalPlannings: [
    {
      id: 'tp1',
      hypothesisId: 'h1',
      entityRef: 'component:default/payments',
      actionType: 'Spike',
      description: 'Load test',
      expectedOutcome: 'Know max throughput',
      documentations: [],
      targetDate: '2026-12-01',
    },
  ],
  recentEvents: [],
};

function assessment(overrides: Partial<AssessmentOutput> = {}): AssessmentOutput {
  return {
    related: true,
    confidence: 0.9,
    rationale: 'Adds a load test harness for the gateway.',
    evidence: [
      { file: 'load/gateway.k6.js', note: 'new load test' },
      { file: 'invented.ts', note: 'not in the PR' },
    ],
    reassessment: null,
    planningProgress: [],
    newPlanning: null,
    statusChange: null,
    ...overrides,
  };
}

function run(a: AssessmentOutput, extra: { merged?: boolean; h?: HypothesisRecord } = {}) {
  return guard(a, extra).suggestions;
}

function guard(a: AssessmentOutput, extra: { merged?: boolean; h?: HypothesisRecord } = {}) {
  return applyGuardrails({
    hypothesis: extra.h ?? hypothesis,
    assessment: a,
    prUrl: PR_URL,
    prMerged: extra.merged ?? false,
    changedFiles: ['load/gateway.k6.js'],
    confidenceThreshold: 0.7,
    today,
  });
}

describe('applyGuardrails', () => {
  it('drops unrelated or low-confidence assessments', () => {
    expect(run(assessment({ related: false }))).toEqual([]);
    expect(run(assessment({ confidence: 0.5 }))).toEqual([]);
  });

  it('emits a link with evidence limited to changed files', () => {
    const [link] = run(assessment());
    expect(link).toMatchObject({ kind: 'link', payload: { url: PR_URL }, confidence: 0.9 });
    expect(link.evidence).toEqual([{ file: 'load/gateway.k6.js', note: 'new load test' }]);
  });

  it('skips the link when the PR is already a related artefact', () => {
    const h = { ...hypothesis, relatedArtefacts: [PR_URL] };
    expect(run(assessment(), { h })).toEqual([]);
  });

  it('ignores planning ids from other hypotheses and "completes" on open PRs', () => {
    const kinds = run(
      assessment({
        planningProgress: [
          { technicalPlanningId: 'other', effect: 'advances', expectedOutcomeUpdate: null, reason: 'x' },
          { technicalPlanningId: 'tp1', effect: 'completes', expectedOutcomeUpdate: null, reason: 'x' },
        ],
      }),
    ).map(s => s.kind);
    expect(kinds).toEqual(['link']);
  });

  it('attributes a reassessment to the planning the PR executes', () => {
    const suggestions = run(
      assessment({
        planningProgress: [
          {
            technicalPlanningId: 'tp1',
            effect: 'completes',
            expectedOutcomeUpdate: 'Single node handles 1400 rps',
            reason: 'Load test merged',
          },
        ],
        reassessment: { uncertainty: 'Low', impact: null, reason: 'Measured' },
      }),
      { merged: true },
    );
    expect(suggestions.map(s => s.kind)).toEqual(['link', 'planning_progress', 'reassessment']);
    expect(suggestions[1]).toMatchObject({
      technicalPlanningId: 'tp1',
      payload: { effect: 'completes', expectedOutcome: 'Single node handles 1400 rps' },
    });
    expect(suggestions[2]).toMatchObject({
      technicalPlanningId: 'tp1',
      payload: { uncertainty: 'Low', impact: 'High', previous: { uncertainty: 'High', impact: 'High' } },
    });
  });

  it('folds a reassessment into a new planning when no existing planning is executed', () => {
    const suggestions = run(
      assessment({
        reassessment: { uncertainty: 'Medium', impact: null, reason: 'Coupling measured' },
        newPlanning: {
          actionType: 'Spike',
          entityRef: null,
          description: 'Benchmark the new client',
          expectedOutcome: 'Throughput numbers',
          targetDate: '2026-11-01',
          reason: 'New client introduced',
        },
      }),
    );
    expect(suggestions.map(s => s.kind)).toEqual(['link', 'new_planning']);
    expect(suggestions[1].payload).toMatchObject({
      uncertainty: 'Medium',
      impact: 'High',
      previous: { uncertainty: 'High', impact: 'High' },
    });
  });

  it('drops a reassessment without any planning to record it on', () => {
    const kinds = run(
      assessment({ reassessment: { uncertainty: 'Low', impact: 'Low', reason: 'x' } }),
    ).map(s => s.kind);
    expect(kinds).toEqual(['link']);
  });

  it('drops no-op reassessments and status changes', () => {
    const kinds = run(
      assessment({
        reassessment: { uncertainty: 'High', impact: null, reason: 'same' },
        statusChange: { status: 'Open', reason: 'same' },
      }),
      { merged: true },
    ).map(s => s.kind);
    expect(kinds).toEqual(['link']);
  });

  it('only allows status changes on merged PRs', () => {
    const a = assessment({ statusChange: { status: 'Validated', reason: 'Proven' } });
    expect(run(a).map(s => s.kind)).toEqual(['link']);
    expect(run(a, { merged: true }).map(s => s.kind)).toEqual(['link', 'status_change']);
  });

  it('normalizes new plannings to what the backend accepts', () => {
    const [, planning] = run(
      assessment({
        newPlanning: {
          actionType: 'Modularization',
          entityRef: 'component:default/unknown',
          description: 'x'.repeat(800),
          expectedOutcome: 'Gateway isolated behind an interface',
          targetDate: '2020-01-01',
          reason: 'Coupling found',
        },
      }),
    );
    expect(planning.kind).toBe('new_planning');
    expect(planning.payload).toMatchObject({
      actionType: 'Modularization',
      entityRef: 'component:default/payments',
      targetDate: '2026-10-09',
    });
    expect((planning.payload.description as string).length).toBe(500);
  });
});

describe('completion handling', () => {
  const documented = {
    ...hypothesis,
    relatedArtefacts: [PR_URL],
    technicalPlannings: [{ ...hypothesis.technicalPlannings[0], documentations: [PR_URL] }],
  };
  const progress = (effect: 'advances' | 'completes') =>
    assessment({
      planningProgress: [{ technicalPlanningId: 'tp1', effect, expectedOutcomeUpdate: null, reason: 'r' }],
    });

  it('keeps "completes" even when the PR is already documented on the planning', () => {
    expect(guard(progress('completes'), { merged: true, h: documented }).suggestions.map(s => s.kind)).toEqual([
      'planning_progress',
    ]);
    expect(guard(progress('advances'), { h: documented }).dropped).toContainEqual({
      kind: 'planning_progress',
      reason: 'PR already in planning documentations and no outcome change',
      technicalPlanningId: 'tp1',
    });
  });

  it('does not propose completing a planning that is already completed, but still anchors a reassessment', () => {
    const result = applyGuardrails({
      hypothesis,
      assessment: { ...progress('completes'), reassessment: { uncertainty: 'Low', impact: null, reason: 'r' } },
      prUrl: PR_URL,
      prMerged: true,
      changedFiles: [],
      confidenceThreshold: 0.7,
      today,
      completedPlanningIds: new Set(['tp1']),
    });
    expect(result.suggestions.map(s => s.kind)).toEqual(['link', 'reassessment']);
    expect(result.dropped).toContainEqual({
      kind: 'planning_progress',
      reason: 'planning already completed',
      technicalPlanningId: 'tp1',
    });
  });
});

describe('dropped proposals', () => {
  it('explains why the assessment itself was discarded', () => {
    expect(guard(assessment({ confidence: 0.5 })).dropped).toEqual([
      { kind: 'assessment', reason: 'confidence 0.5 below threshold 0.7' },
    ]);
    expect(guard(assessment({ related: false })).dropped).toEqual([
      { kind: 'assessment', reason: 'model marked it unrelated' },
    ]);
  });

  it('explains every filtered proposal', () => {
    const { suggestions, dropped } = guard(
      assessment({
        planningProgress: [
          { technicalPlanningId: 'other', effect: 'advances', expectedOutcomeUpdate: null, reason: 'x' },
          { technicalPlanningId: 'tp1', effect: 'completes', expectedOutcomeUpdate: null, reason: 'x' },
        ],
        reassessment: { uncertainty: 'Low', impact: null, reason: 'x' },
        statusChange: { status: 'Validated', reason: 'x' },
      }),
      { h: { ...hypothesis, relatedArtefacts: [PR_URL] } },
    );
    expect(suggestions).toEqual([]);
    expect(dropped).toEqual([
      { kind: 'link', reason: 'PR is already a related artefact' },
      {
        kind: 'planning_progress',
        reason: 'unknown technical planning id for this hypothesis',
        technicalPlanningId: 'other',
      },
      { kind: 'planning_progress', reason: '"completes" requires a merged PR', technicalPlanningId: 'tp1' },
      {
        kind: 'reassessment',
        reason: 'no technical planning to record it on (no planning progress or new planning)',
      },
      { kind: 'status_change', reason: 'status changes require a merged PR' },
    ]);
  });
});

describe('preserveGoalPrefix', () => {
  const original =
    'Goal: Reduce uncertainty. Evidence: one node sustains 1000 rps at p95 < 200 ms. Expected effect: uncertainty High → Low.';

  it('keeps the goal and evidence when a PR updates a designer-written outcome', () => {
    expect(preserveGoalPrefix(original, 'Load test merged: 1400 rps at p95 140 ms')).toBe(
      'Goal: Reduce uncertainty. Evidence: one node sustains 1000 rps at p95 < 200 ms. Update: Load test merged: 1400 rps at p95 140 ms',
    );
  });

  it('leaves other outcomes and full rewrites alone', () => {
    expect(preserveGoalPrefix('Know max throughput', 'Measured 1400 rps')).toBe('Measured 1400 rps');
    expect(preserveGoalPrefix(original, 'Goal: Accept or refute. Evidence: done.')).toBe('Goal: Accept or refute. Evidence: done.');
  });

  it('stays within 500 characters', () => {
    expect(preserveGoalPrefix(`Goal: Reduce impact. Evidence: ${'e'.repeat(480)}`, 'u'.repeat(600)).length).toBeLessThanOrEqual(500);
  });
});

describe('helpers', () => {
  it('clampText trims and bounds', () => {
    expect(clampText('  hi  ')).toBe('hi');
    expect(clampText('abcdef', 4)).toBe('abc…');
  });

  it('normalizeTargetDate keeps valid future dates', () => {
    expect(normalizeTargetDate('2026-11-30', today)).toBe('2026-11-30');
    expect(normalizeTargetDate('2026-02-31', today)).toBe('2026-10-09');
    expect(normalizeTargetDate(null, today)).toBe('2026-10-09');
  });
});
