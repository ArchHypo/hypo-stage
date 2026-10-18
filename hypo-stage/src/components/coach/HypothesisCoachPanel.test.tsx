import { default as React } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { HypothesisReview } from '../../api/HypoStageApi';
import type { HypothesisCoach } from '../../hooks/useHypothesisCoach';
import { HypothesisCoachPanel } from './HypothesisCoachPanel';

const review: HypothesisReview = {
  reviewId: 'r1',
  verdict: 'needs_work',
  classification: 'requirement',
  classificationReason: 'It states a target the system must meet.',
  falsifiable: false,
  refutingEvidence: null,
  issues: [
    {
      type: 'not_a_hypothesis',
      severity: 'warning',
      message: 'This is a target, not a belief.',
      concept: 'A hypothesis states an uncertain belief.',
    },
  ],
  rewrites: [{ statement: 'A single instance can sustain 1000 requests per second', reason: 'States the belief' }],
  splitInto: [],
  suggestedSourceType: 'Quality Attribute',
  suggestedQualityAttributes: ['Performance', 'Scalability'],
};

function coach(overrides: Partial<HypothesisCoach> = {}): HypothesisCoach {
  return {
    enabled: true,
    checkOnSave: true,
    review,
    loading: false,
    error: null,
    isStale: () => false,
    requestReview: jest.fn().mockResolvedValue(review),
    checkBeforeSave: jest.fn(),
    ...overrides,
  };
}

const input = {
  statement: 'The system must process 1000 requests per second',
  sourceType: 'Requirements',
  qualityAttributes: ['Performance'],
};

describe('HypothesisCoachPanel', () => {
  const handlers = () => ({
    onStatementChange: jest.fn(),
    onSourceTypeChange: jest.fn(),
    onQualityAttributesChange: jest.fn(),
  });

  it('requests a review and shows the result', async () => {
    const c = coach();
    render(<HypothesisCoachPanel coach={c} input={input} qualityAttributes={['Performance']} {...handlers()} />);

    await userEvent.click(screen.getByRole('button', { name: /Review with AI/ }));
    expect(c.requestReview).toHaveBeenCalledWith(input);

    expect(screen.getByText(/This statement needs work/)).toBeInTheDocument();
    expect(screen.getByText(/This reads as a requirement/)).toBeInTheDocument();
    expect(screen.getByText(/This is a target, not a belief/)).toBeInTheDocument();
    expect(screen.getByText(/ArchHypo: A hypothesis states an uncertain belief/)).toBeInTheDocument();
    expect(screen.getByText(/Not falsifiable yet/)).toBeInTheDocument();
  });

  it('applies rewrites, source type and quality attributes', async () => {
    const h = handlers();
    render(<HypothesisCoachPanel coach={coach()} input={input} qualityAttributes={['Performance']} {...h} />);

    await userEvent.click(screen.getByRole('button', { name: 'Use this' }));
    expect(h.onStatementChange).toHaveBeenCalledWith('A single instance can sustain 1000 requests per second');

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(h.onSourceTypeChange).toHaveBeenCalledWith('Quality Attribute');

    expect(screen.queryByText('Add Performance')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Add Scalability'));
    expect(h.onQualityAttributesChange).toHaveBeenCalledWith(['Performance', 'Scalability']);
  });

  it('flags stale reviews and blocks reviews of short statements', () => {
    const { rerender } = render(
      <HypothesisCoachPanel coach={coach({ isStale: () => true })} input={input} qualityAttributes={[]} {...handlers()} />,
    );
    expect(screen.getByText(/Statement changed since this review/)).toBeInTheDocument();

    rerender(
      <HypothesisCoachPanel coach={coach({ review: null })} input={{ statement: 'short' }} qualityAttributes={[]} {...handlers()} />,
    );
    expect(screen.getByRole('button', { name: /Review with AI/ })).toBeDisabled();
  });
});
