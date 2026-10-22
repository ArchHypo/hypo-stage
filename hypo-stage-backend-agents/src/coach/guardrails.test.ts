import { guardReview } from './guardrails';
import type { HypothesisReviewOutput } from './schemas';

const input = {
  statement: 'The system must process 1000 requests per second',
  sourceType: 'Requirements',
  qualityAttributes: ['Performance'],
};

function output(overrides: Partial<HypothesisReviewOutput> = {}): HypothesisReviewOutput {
  return {
    classification: 'requirement',
    classificationReason: 'A target the system must meet.',
    falsifiable: false,
    refutingEvidence: null,
    issues: [
      { type: 'not_a_hypothesis', severity: 'warning', message: 'It is a target', concept: 'Hypotheses state beliefs' },
    ],
    rewrites: [],
    splitInto: [],
    suggestedSourceType: null,
    suggestedQualityAttributes: [],
    ...overrides,
  };
}

describe('guardReview', () => {
  it('filters rewrites to usable, distinct statements', () => {
    const review = guardReview(
      input,
      output({
        rewrites: [
          { statement: '  the system must process 1000 REQUESTS per second ', reason: 'same as input' },
          { statement: 'Too short', reason: 'x' },
          { statement: 'A single instance can sustain 1000 requests per second', reason: 'belief' },
          { statement: 'A single instance can sustain 1000 requests per second', reason: 'dup' },
          { statement: 'One node with the current cache handles 1000 rps at p95 < 200 ms', reason: 'b' },
          { statement: 'The managed queue absorbs 1000 requests per second bursts', reason: 'c' },
        ],
      }),
    );
    expect(review.rewrites.map(r => r.statement)).toEqual([
      'A single instance can sustain 1000 requests per second',
      'One node with the current cache handles 1000 rps at p95 < 200 ms',
    ]);
  });

  it('keeps split parts only for too_broad statements', () => {
    const parts = ['Part one is a long enough statement', 'Part two is a long enough statement'];
    expect(guardReview(input, output({ splitInto: parts })).splitInto).toEqual([]);
    const broad = output({
      splitInto: [...parts, 'short'],
      issues: [{ type: 'too_broad', severity: 'warning', message: 'm', concept: 'c' }],
    });
    expect(guardReview(input, broad).splitInto).toEqual(parts);
  });

  it('only suggests new, valid quality attributes and source types', () => {
    const review = guardReview(
      input,
      output({
        suggestedSourceType: 'Requirements',
        suggestedQualityAttributes: ['Performance', 'Scalability', 'Speed' as any, 'Scalability'],
      }),
    );
    expect(review.suggestedSourceType).toBeNull();
    expect(review.suggestedQualityAttributes).toEqual(['Scalability']);
    expect(guardReview(input, output({ suggestedSourceType: 'Solution' })).suggestedSourceType).toBe('Solution');
  });

  it('computes the verdict', () => {
    expect(guardReview(input, output()).verdict).toBe('needs_work');
    expect(guardReview(input, output({ classification: 'hypothesis', issues: [] })).verdict).toBe('ok');
    expect(
      guardReview(
        input,
        output({
          classification: 'hypothesis',
          issues: [{ type: 'vague_terms', severity: 'info', message: 'm', concept: 'c' }],
        }),
      ).verdict,
    ).toBe('ok');
  });
});
