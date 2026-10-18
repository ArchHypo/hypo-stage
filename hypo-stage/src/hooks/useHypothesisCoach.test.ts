import { createElement, ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef, HypothesisReview } from '../api/HypoStageApi';
import { useHypothesisCoach } from './useHypothesisCoach';

const review = (verdict: 'ok' | 'needs_work'): HypothesisReview => ({
  reviewId: `r-${verdict}`,
  verdict,
  classification: verdict === 'ok' ? 'hypothesis' : 'requirement',
  classificationReason: 'reason',
  falsifiable: verdict === 'ok',
  refutingEvidence: null,
  issues: verdict === 'ok' ? [] : [{ type: 'not_a_hypothesis', severity: 'warning', message: 'm', concept: 'c' }],
  rewrites: [],
  splitInto: [],
  suggestedSourceType: null,
  suggestedQualityAttributes: [],
});

const api = {
  getAgentsStatus: jest.fn(),
  reviewHypothesisDraft: jest.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(TestApiProvider, { apis: [[HypoStageApiRef, api]], children });

const input = { statement: 'The system must process 1000 requests per second' };

async function renderCoach(coach = { enabled: true, checkOnSave: true }, options = {}) {
  api.getAgentsStatus.mockResolvedValue({ available: true, enabled: false, coach });
  const hook = renderHook(() => useHypothesisCoach(options), { wrapper });
  await waitFor(() => expect(api.getAgentsStatus).toHaveBeenCalled());
  await waitFor(() => expect(hook.result.current.enabled).toBe(coach.enabled));
  return hook;
}

describe('useHypothesisCoach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reviews on demand and detects stale results', async () => {
    api.reviewHypothesisDraft.mockResolvedValue(review('needs_work'));
    const { result } = await renderCoach({ enabled: true, checkOnSave: true }, { hypothesisId: 'h1' });

    await act(async () => {
      await result.current.requestReview(input);
    });

    expect(api.reviewHypothesisDraft).toHaveBeenCalledWith({ ...input, hypothesisId: 'h1' }, 'on_demand');
    expect(result.current.review?.verdict).toBe('needs_work');
    expect(result.current.isStale('  the system must process 1000 REQUESTS per second')).toBe(false);
    expect(result.current.isStale('A different statement entirely here')).toBe(true);
  });

  it('keeps only the latest response', async () => {
    let resolveFirst: (r: HypothesisReview) => void = () => undefined;
    api.reviewHypothesisDraft
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(review('ok'));
    const { result } = await renderCoach();

    let first: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current.requestReview(input);
      await result.current.requestReview({ statement: 'A single node sustains 1000 requests per second' });
    });
    await act(async () => {
      resolveFirst(review('needs_work'));
      await first;
    });

    expect(result.current.review?.verdict).toBe('ok');
  });

  describe('checkBeforeSave', () => {
    it('proceeds when the coach or the save check is off', async () => {
      const { result } = await renderCoach({ enabled: true, checkOnSave: false });
      expect(await result.current.checkBeforeSave(input)).toEqual({ action: 'proceed' });
      expect(api.reviewHypothesisDraft).not.toHaveBeenCalled();
    });

    it('proceeds when an edited statement is unchanged', async () => {
      const { result } = await renderCoach();
      expect(await result.current.checkBeforeSave(input, input.statement)).toEqual({ action: 'proceed' });
      expect(api.reviewHypothesisDraft).not.toHaveBeenCalled();
    });

    it('runs a save review and asks to confirm when it needs work', async () => {
      api.reviewHypothesisDraft.mockResolvedValue(review('needs_work'));
      const { result } = await renderCoach();
      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.checkBeforeSave(input);
      });
      expect(api.reviewHypothesisDraft).toHaveBeenCalledWith(expect.anything(), 'save');
      expect(outcome).toMatchObject({ action: 'confirm', review: { verdict: 'needs_work' } });
    });

    it('reuses a fresh ok review without calling the coach again', async () => {
      api.reviewHypothesisDraft.mockResolvedValue(review('ok'));
      const { result } = await renderCoach();
      await act(async () => {
        await result.current.requestReview(input);
      });
      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.checkBeforeSave(input);
      });
      expect(outcome).toEqual({ action: 'proceed' });
      expect(api.reviewHypothesisDraft).toHaveBeenCalledTimes(1);
    });

    it('never blocks saving when the coach fails', async () => {
      api.reviewHypothesisDraft.mockRejectedValue(new Error('The coach took too long to answer'));
      const { result } = await renderCoach();
      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.checkBeforeSave(input);
      });
      expect(outcome).toEqual({ action: 'proceed' });
      expect(result.current.error).toBe('The coach took too long to answer');
    });
  });
});
