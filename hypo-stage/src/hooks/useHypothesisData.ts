import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { Hypothesis, HypothesisEvent } from '@internal/plugin-hypo-stage-backend';

/**
 * Hook for managing hypothesis data fetching and state
 */
export const useHypothesisData = (hypothesisId?: string) => {
  const api = useApi(HypoStageApiRef);
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [events, setEvents] = useState<HypothesisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHypothesis = useCallback(async () => {
    if (!hypothesisId) return;

    try {
      setLoading(true);
      setError(null);

      const hypotheses = await api.getHypotheses();
      const found = hypotheses.find(h => h.id === hypothesisId);

      if (found) {
        setHypothesis(found);

        // Fetch events for the hypothesis
        try {
          const hypothesisEvents = await api.getEvents(hypothesisId);
          setEvents(hypothesisEvents);
        } catch (eventErr) {
          // Events are optional, don't fail the whole operation
          setEvents([]);
        }
      } else {
        setError(new Error('Hypothesis not found'));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [api, hypothesisId]);

  const refreshHypothesis = useCallback(async () => {
    if (!hypothesisId) return;

    try {
      const hypotheses = await api.getHypotheses();
      const found = hypotheses.find(h => h.id === hypothesisId);
      if (found) {
        setHypothesis(found);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [api, hypothesisId]);

  useEffect(() => {
    if (hypothesisId) {
      fetchHypothesis();
    } else {
      setLoading(false);
      setError(new Error('Hypothesis not found'));
    }
  }, [fetchHypothesis, hypothesisId]);

  return {
    hypothesis,
    events,
    loading,
    error,
    refreshHypothesis,
    refetch: fetchHypothesis
  };
};
