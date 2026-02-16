import { default as React } from 'react';
import { createDevApp } from '@backstage/dev-utils';
import {
  discoveryApiRef,
  fetchApiRef,
  DiscoveryApi,
  FetchApi,
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
import {
  hypoStagePlugin,
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage,
  HypoStageApiRef,
  HypoStageApiClient,
} from '../src/index';

// Standalone dev has no auth backend. Force the "standalone-guest" provider so we never
// run the built-in "guest" provider (which calls /api/auth/guest/refresh and 404s).
const SIGN_IN_PROVIDER_KEY = '@backstage/core:SignInPage:provider';
if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem(SIGN_IN_PROVIDER_KEY);
  if (stored === 'guest' || !stored) {
    window.localStorage.setItem(SIGN_IN_PROVIDER_KEY, 'standalone-guest');
  }
}

// API ref for the standalone guest sign-in provider (no backend calls).
const standaloneGuestAuthApiRef = createApiRef<{
  getBackstageIdentity(options?: { optional?: boolean; instantPopup?: boolean }): Promise<{
    identity: { type: 'user'; userEntityRef: string; ownershipEntityRefs: string[] };
    token?: string;
  } | undefined>;
  getProfile(): Promise<{ displayName: string; email: string }>;
}>({ id: 'plugin.hypo-stage.standalone-guest-auth' });

// Standalone guest auth: resolves immediately, no network calls.
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

// Custom discovery API for standalone dev mode
// Points to the backend running on localhost:7007
const standaloneDiscoveryApi: DiscoveryApi = {
  async getBaseUrl(pluginId: string): Promise<string> {
    // Backend is running on localhost:7007
    return `http://localhost:7007/api/${pluginId}`;
  },
};

// Simple fetch API for standalone dev mode
// No credentials: backend uses mock auth, and credentials: 'include' would require
// the server to send a specific Origin (not *) in CORS, which would conflict with our router.
const standaloneFetchApi: FetchApi = {
  fetch: async (url, options) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  },
};

// Sample catalog entities for standalone dev mode
const sampleEntities = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'user-service', namespace: 'default' },
    spec: { type: 'service', team: 'platform-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'payment-service', namespace: 'default' },
    spec: { type: 'service', team: 'payment-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'auth-service', namespace: 'default' },
    spec: { type: 'service', team: 'security-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'api-gateway', namespace: 'default' },
    spec: { type: 'service', team: 'platform-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'notification-service', namespace: 'default' },
    spec: { type: 'service', team: 'platform-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'analytics-service', namespace: 'default' },
    spec: { type: 'service', team: 'data-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'frontend-app', namespace: 'default' },
    spec: { type: 'website', team: 'frontend-team' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'mobile-app', namespace: 'default' },
    spec: { type: 'mobile', team: 'mobile-team' },
  },
];

// Normalize EntityFilterQuery (can be single object or array) to array of record filters
function toFilterArray(filter: EntityFilterQuery | undefined): Record<string, string | symbol | (string | symbol)[]>[] {
  if (!filter) return [];
  return Array.isArray(filter) ? filter : [filter];
}

// Mock catalog API for standalone dev mode
// Returns sample entities so users can select entity references when creating hypotheses
const mockCatalogApi: CatalogApi = {
  getEntities: async (request?: GetEntitiesRequest) => {
    let filtered = [...sampleEntities];
    const filters = toFilterArray(request?.filter);
    for (const filter of filters) {
      if (typeof filter.kind === 'string') {
        filtered = filtered.filter(e => e.kind === filter.kind);
      }
      if (typeof filter['spec.team'] === 'string') {
        filtered = filtered.filter(e => e.spec?.team === filter['spec.team']);
      }
    }
    return { items: filtered, totalItems: filtered.length };
  },
  getEntityByRef: async (entityRef) => {
    const refStr = typeof entityRef === 'string' ? entityRef : stringifyEntityRef(entityRef);
    const match = refStr.match(/^component:default\/(.+)$/);
    if (match) {
      const name = match[1];
      return sampleEntities.find(e => e.metadata.name === name);
    }
    return undefined;
  },
  getEntitiesByRefs: async (request: GetEntitiesByRefsRequest) => {
    const refs = request.entityRefs ?? [];
    const items = refs
      .map((ref: string) => {
        const match = ref.match(/^component:default\/(.+)$/);
        if (match) {
          const name = match[1];
          return sampleEntities.find(e => e.metadata.name === name);
        }
        return undefined;
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
        if (typeof filterObj.kind === 'string') {
          const filterKind = String(filterObj.kind).toLowerCase();
          filtered = filtered.filter(e => e.kind.toLowerCase() === filterKind);
        }
        if (typeof filterObj['spec.team'] === 'string') {
          filtered = filtered.filter(e => e.spec?.team === filterObj['spec.team']);
        }
      }
    }
    if (initialRequest?.fullTextFilter?.term) {
      const term = initialRequest.fullTextFilter.term.toLowerCase().trim();
      if (term.length > 0) {
        filtered = filtered.filter(
          e =>
            e.metadata.name.toLowerCase().includes(term) ||
            (e.spec?.team?.toLowerCase().includes(term) ?? false) ||
            (e.spec?.type?.toLowerCase().includes(term) ?? false),
        );
      }
    }
    filtered.sort((a, b) =>
      a.metadata.name.toLowerCase().localeCompare(b.metadata.name.toLowerCase()),
    );
    const limit = initialRequest?.limit ?? 50;
    const limited = filtered.slice(0, limit);
    return { items: limited, totalItems: filtered.length, pageInfo: {} };
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
  .registerApi({
    api: discoveryApiRef,
    deps: {},
    factory: () => standaloneDiscoveryApi,
  })
  .registerApi({
    api: fetchApiRef,
    deps: {},
    factory: () => standaloneFetchApi,
  })
  .registerApi({
    api: catalogApiRef,
    deps: {},
    factory: () => mockCatalogApi,
  })
  .registerApi({
    api: standaloneGuestAuthApiRef,
    deps: {},
    factory: () => standaloneGuestAuthApi,
  })
  .registerApi({
    api: HypoStageApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new HypoStageApiClient({ discoveryApi, fetchApi }),
  })
  .addSignInProvider({
    id: 'standalone-guest',
    title: 'Standalone guest',
    message: 'Sign in as guest without an auth backend (recommended for local dev).',
    apiRef: standaloneGuestAuthApiRef as any,
  })
  .addPage({
    element: <HypoStagePage />,
    title: 'Root Page',
    path: '/hypo-stage',
  })
  .addPage({
    element: <CreateHypothesisPage />,
    title: 'Create Hypothesis Page',
    path: '/hypo-stage/create-hypothesis',
  })
  .addPage({
    element: <HypothesisPage />,
    title: 'Hypothesis Page',
    path: '/hypo-stage/hypothesis/:hypothesisId',
  })
  .addPage({
    element: <EditHypothesisPage />,
    title: 'Edit Hypothesis Page',
    path: '/hypo-stage/hypothesis/:hypothesisId/edit',
  })
  .render();
