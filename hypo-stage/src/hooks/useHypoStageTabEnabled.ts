import { useApi, featureFlagsApiRef } from '@backstage/core-plugin-api';
import { HYPO_STAGE_FEATURE_FLAG } from '../featureFlags';

/**
 * Returns whether the Hypo Stage feature flag is enabled (e.g. to show Hypotheses tab on catalog entity page).
 * Uses the same flag as the plugin routes and sidebar entry.
 */
export function useHypoStageTabEnabled(): boolean {
  const featureFlags = useApi(featureFlagsApiRef);
  return featureFlags.isActive(HYPO_STAGE_FEATURE_FLAG);
}
