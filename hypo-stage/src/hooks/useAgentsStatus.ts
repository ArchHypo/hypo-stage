import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { AGENTS_UNAVAILABLE, AgentsStatus, HypoStageApiRef } from '../api/HypoStageApi';

/** Which agent features the backend offers; everything is off until the status loads. */
export const useAgentsStatus = (): AgentsStatus => {
  const api = useApi(HypoStageApiRef);
  const [status, setStatus] = useState<AgentsStatus>(AGENTS_UNAVAILABLE);

  useEffect(() => {
    let cancelled = false;
    api
      .getAgentsStatus()
      .then(s => !cancelled && setStatus(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  return status;
};
