import { default as React } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { HypothesisList } from './HypothesisList';
import { NotificationProvider } from '../providers/NotificationProvider';

/**
 * Renders the list of hypotheses that reference the current catalog entity (component).
 * Used as a tab on the catalog component entity page. Requires hypo-stage feature flag.
 */
export function EntityHypothesesTab() {
  const { entity } = useEntity();
  const entityRef = stringifyEntityRef(entity);

  return (
    <NotificationProvider>
      <HypothesisList entityRef={entityRef} />
    </NotificationProvider>
  );
}
