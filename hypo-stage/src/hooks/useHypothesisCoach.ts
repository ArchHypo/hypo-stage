import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef, HypothesisReview, HypothesisReviewInput } from '../api/HypoStageApi';

const normalize = (statement: string) => statement.trim().replace(/\s+/g, ' ').toLowerCase();

export type SaveCheckResult = { action: 'proceed' } | { action: 'confirm'; review: HypothesisReview };

export interface HypothesisCoach {
  enabled: boolean;
  checkOnSave: boolean;
  review: HypothesisReview | null;
  loading: boolean;
  error: string | null;
  /** True when the statement changed since the current review was made. */
  isStale: (statement: string) => boolean;
  requestReview: (input: HypothesisReviewInput) => Promise<HypothesisReview | null>;
  /**
   * Never blocks saving: returns `confirm` only when the statement has a review that
   * needs work; any failure of the coach lets the save proceed.
   */
  checkBeforeSave: (input: HypothesisReviewInput, originalStatement?: string) => Promise<SaveCheckResult>;
}

export const useHypothesisCoach = (options: { hypothesisId?: string } = {}): HypothesisCoach => {
  const api = useApi(HypoStageApiRef);
  const [status, setStatus] = useState({ enabled: false, checkOnSave: false });
  const [review, setReview] = useState<HypothesisReview | null>(null);
  const [reviewedStatement, setReviewedStatement] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const { hypothesisId } = options;

  useEffect(() => {
    let cancelled = false;
    api
      .getAgentsStatus()
      .then(s => !cancelled && setStatus(s.coach))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  const isStale = useCallback(
    (statement: string) => reviewedStatement === null || normalize(statement) !== reviewedStatement,
    [reviewedStatement],
  );

  const run = useCallback(
    async (input: HypothesisReviewInput, trigger: 'on_demand' | 'save') => {
      const requestId = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const result = await api.reviewHypothesisDraft({ ...input, hypothesisId: hypothesisId ?? null }, trigger);
        if (requestId !== latestRequest.current) {
          return null; // a newer review was requested meanwhile
        }
        setReview(result);
        setReviewedStatement(normalize(input.statement));
        return result;
      } catch (err) {
        if (requestId === latestRequest.current) {
          setError(err instanceof Error ? err.message : 'The coach could not review the statement');
        }
        throw err;
      } finally {
        if (requestId === latestRequest.current) {
          setLoading(false);
        }
      }
    },
    [api, hypothesisId],
  );

  const requestReview = useCallback(
    (input: HypothesisReviewInput) => run(input, 'on_demand').catch(() => null),
    [run],
  );

  const checkBeforeSave = useCallback(
    async (input: HypothesisReviewInput, originalStatement?: string): Promise<SaveCheckResult> => {
      if (!status.enabled || !status.checkOnSave) {
        return { action: 'proceed' };
      }
      if (originalStatement !== undefined && normalize(originalStatement) === normalize(input.statement)) {
        return { action: 'proceed' };
      }
      let current = review && !isStale(input.statement) ? review : null;
      if (!current) {
        try {
          current = await run(input, 'save');
        } catch {
          return { action: 'proceed' };
        }
      }
      return current && current.verdict === 'needs_work'
        ? { action: 'confirm', review: current }
        : { action: 'proceed' };
    },
    [status, review, isStale, run],
  );

  return {
    enabled: status.enabled,
    checkOnSave: status.checkOnSave,
    review,
    loading,
    error,
    isStale,
    requestReview,
    checkBeforeSave,
  };
};
