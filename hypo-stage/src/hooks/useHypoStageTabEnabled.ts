import { useApiHolder, featureFlagsApiRef } from '@backstage/core-plugin-api';
import { HYPO_STAGE_FEATURE_FLAG } from '../featureFlags';

/**
 * Returns whether the Hypo Stage feature flag is enabled (e.g. to show Hypotheses tab on catalog entity page).
 * Uses the same flag as the plugin routes and sidebar entry.
 *
 * When the Feature Flags API is not registered (e.g. generic Backstage without the feature-flags plugin),
 * returns true so the tab is visible by default. This keeps the plugin compatible with any Backstage instance.
 */
export function useHypoStageTabEnabled(): boolean {
  const apiHolder = useApiHolder();
  const featureFlags = apiHolder.get(featureFlagsApiRef);
  if (!featureFlags) {
    return true;
  }
  return featureFlags.isActive(HYPO_STAGE_FEATURE_FLAG);
}
