import { useState, useCallback } from 'react';

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic API call hook with loading and error states
 */
export const useApiCall = <T>() => {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      setState({ data: null, loading: false, error: errorObj });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
};
