/**
 * Standalone demo app with mock API and seed data (no backend).
 * Used for static build deployed to GitHub Pages.
 */
import { default as React } from 'react';
import { createDevApp } from '@backstage/dev-utils';
import {
  discoveryApiRef,
  createApiRef,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import type {
  CatalogApi,
  GetEntitiesRequest,
  GetEntitiesByRefsRequest,
  QueryEntitiesRequest,
  QueryEntitiesResponse,
  EntityFilterQuery,
} from '@backstage/catalog-client';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { Navigate } from 'react-router-dom';
import {
  hypoStagePlugin,
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage,
  HypoStageApiRef,
} from '../src/index';
import { HypoStageMockApi } from '../src/api/HypoStageMockApi';

const SIGN_IN_PROVIDER_KEY = '@backstage/core:SignInPage:provider';
if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem(SIGN_IN_PROVIDER_KEY);
  if (stored === 'guest' || !stored) {
    window.localStorage.setItem(SIGN_IN_PROVIDER_KEY, 'standalone-guest');
  }
}

const standaloneGuestAuthApiRef = createApiRef<{
  getBackstageIdentity(options?: { optional?: boolean; instantPopup?: boolean }): Promise<{
    identity: { type: 'user'; userEntityRef: string; ownershipEntityRefs: string[] };
    token?: string;
  } | undefined>;
  getProfile(): Promise<{ displayName: string; email: string }>;
}>({ id: 'plugin.hypo-stage.standalone-guest-auth' });

const standaloneGuestAuthApi = {
  async getBackstageIdentity(_options?: { optional?: boolean; instantPopup?: boolean }) {
    return {
      identity: {
        type: 'user' as const,
        userEntityRef: 'user:default/guest',
        ownershipEntityRefs: ['user:default/guest'],
      },
      token: undefined,
    };
  },
  async getProfile() {
    return { displayName: 'Guest', email: 'guest@example.com' };
  },
};

// No-op discovery (mock API does not call any backend)
const mockDiscoveryApi = {
  async getBaseUrl(_pluginId: string): Promise<string> {
    return '';
  },
};

const sampleEntities = [
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'user-service', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'payment-service', namespace: 'default' }, spec: { type: 'service', team: 'payment-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'auth-service', namespace: 'default' }, spec: { type: 'service', team: 'security-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'api-gateway', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'notification-service', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'analytics-service', namespace: 'default' }, spec: { type: 'service', team: 'data-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'order-service', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'legacy-inventory', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'notification-worker', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'example-website', namespace: 'default' }, spec: { type: 'website', team: 'frontend-team' } },
  { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'user-api', namespace: 'default' }, spec: { type: 'service', team: 'platform-team' } },
];

function toFilterArray(filter: EntityFilterQuery | undefined): Record<string, string | symbol | (string | symbol)[]>[] {
  if (!filter) return [];
  return Array.isArray(filter) ? filter : [filter];
}

const mockCatalogApi: CatalogApi = {
  getEntities: async (request?: GetEntitiesRequest) => {
    let filtered = [...sampleEntities];
    const filters = toFilterArray(request?.filter);
    for (const filter of filters) {
      if (typeof filter.kind === 'string') filtered = filtered.filter(e => e.kind === filter.kind);
      if (typeof filter['spec.team'] === 'string') filtered = filtered.filter(e => e.spec?.team === filter['spec.team']);
    }
    return { items: filtered, totalItems: filtered.length };
  },
  getEntityByRef: async (entityRef) => {
    const refStr = typeof entityRef === 'string' ? entityRef : stringifyEntityRef(entityRef);
    const match = refStr.match(/^component:default\/(.+)$/);
    if (match) return sampleEntities.find(e => e.metadata.name === match[1]);
    return undefined;
  },
  getEntitiesByRefs: async (request: GetEntitiesByRefsRequest) => {
    const refs = request.entityRefs ?? [];
    const items = refs
      .map((ref: string) => {
        const m = ref.match(/^component:default\/(.+)$/);
        return m ? sampleEntities.find(e => e.metadata.name === m[1]) : undefined;
      })
      .filter((e): e is (typeof sampleEntities)[0] => e !== undefined);
    return { items };
  },
  queryEntities: async (request?: QueryEntitiesRequest): Promise<QueryEntitiesResponse> => {
    let filtered = [...sampleEntities];
    const initialRequest = request && 'filter' in request ? request : undefined;
    if (initialRequest?.filter) {
      const filters = toFilterArray(initialRequest.filter);
      for (const filterObj of filters) {
        if (typeof filterObj.kind === 'string') filtered = filtered.filter(e => e.kind.toLowerCase() === String(filterObj.kind).toLowerCase());
        if (typeof filterObj['spec.team'] === 'string') filtered = filtered.filter(e => e.spec?.team === filterObj['spec.team']);
      }
    }
    if (initialRequest?.fullTextFilter?.term) {
      const term = initialRequest.fullTextFilter.term.toLowerCase().trim();
      if (term.length > 0) filtered = filtered.filter(e =>
        e.metadata.name.toLowerCase().includes(term) || (e.spec?.team?.toLowerCase().includes(term) ?? false) || (e.spec?.type?.toLowerCase().includes(term) ?? false),
      );
    }
    filtered.sort((a, b) => a.metadata.name.toLowerCase().localeCompare(b.metadata.name.toLowerCase()));
    const limit = initialRequest?.limit ?? 50;
    return { items: filtered.slice(0, limit), totalItems: filtered.length, pageInfo: {} };
  },
  getLocationByEntity: async () => undefined,
  getLocationById: async () => undefined,
  getLocationByRef: async () => undefined,
  addLocation: async () => ({ location: { id: '', type: '', target: '' }, entities: [] }),
  removeLocationById: async () => {},
  removeEntityByUid: async () => {},
  refreshEntity: async () => {},
  getEntityAncestors: async () => ({ rootEntityRef: '', items: [] }),
  getEntityFacets: async () => ({ facets: {} }),
  getLocations: async () => ({ items: [] }),
  validateEntity: async () => ({ valid: true, errors: [] }),
  analyzeLocation: async () => ({ existingEntityFiles: [], generateEntities: [] }),
  streamEntities: async function* streamEntities() {},
};

createDevApp()
  .registerPlugin(hypoStagePlugin)
  .registerApi({ api: discoveryApiRef, deps: {}, factory: () => mockDiscoveryApi })
  .registerApi({ api: catalogApiRef, deps: {}, factory: () => mockCatalogApi })
  .registerApi({ api: standaloneGuestAuthApiRef, deps: {}, factory: () => standaloneGuestAuthApi })
  .registerApi({ api: HypoStageApiRef, deps: {}, factory: () => new HypoStageMockApi() })
  .addSignInProvider({
    id: 'standalone-guest',
    title: 'Standalone guest',
    message: 'Sign in as guest (read-only demo).',
    apiRef: standaloneGuestAuthApiRef as any,
  })
  .addPage({ element: <Navigate to="/hypo-stage" replace />, title: 'Home', path: '/' })
  .addPage({ element: <HypoStagePage />, title: 'HypoStage', path: '/hypo-stage' })
  .addPage({ element: <CreateHypothesisPage />, title: 'Create Hypothesis Page', path: '/hypo-stage/create-hypothesis' })
  .addPage({ element: <HypothesisPage />, title: 'Hypothesis Page', path: '/hypo-stage/hypothesis/:hypothesisId' })
  .addPage({ element: <EditHypothesisPage />, title: 'Edit Hypothesis Page', path: '/hypo-stage/hypothesis/:hypothesisId/edit' })
  .render();
