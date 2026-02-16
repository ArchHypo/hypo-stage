import { createBackend } from '@backstage/backend-defaults';
import { hypoStagePlugin } from '../src/plugin';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { CatalogService } from '@backstage/plugin-catalog-node';
import {
  createServiceFactory,
  coreServices,
  type BackstageCredentials,
  type BackstageUserPrincipal,
  type HttpAuthService,
} from '@backstage/backend-plugin-api';

const backend = createBackend();

// Guest credentials for standalone dev (no auth backend)
const guestCredentials: BackstageCredentials<BackstageUserPrincipal> = {
  $$type: '@backstage/BackstageCredentials',
  principal: {
    type: 'user',
    userEntityRef: 'user:development/guest',
  },
};

// Mock HTTP auth for standalone dev: no auth backend, so all requests are accepted
// with a guest principal. Avoids 401 and duplicate service registration.
const mockHttpAuthFactory = createServiceFactory({
  service: coreServices.httpAuth,
  deps: {},
  factory: async (): Promise<HttpAuthService> =>
    ({
      credentials: async () => guestCredentials,
      issueUserCookie: async () => ({ expiresAt: new Date() }),
      issueLimitedUserCookie: async () => {},
    }) as HttpAuthService,
});
backend.add(mockHttpAuthFactory);

// Sample catalog entities for standalone dev mode
const sampleCatalogEntities = [
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

// Register a mock catalog service for standalone dev mode
// Returns sample entities so users can select entity references when creating hypotheses
const mockCatalogServiceFactory = createServiceFactory({
  service: catalogServiceRef,
  deps: {},
  factory: async () => {
    const mockCatalogService: CatalogService = {
      getEntities: async (request, options) => {
        let filtered = [...sampleCatalogEntities];
        let filters: Array<{ kind?: string; 'spec.team'?: string }> = [];
        if (request?.filter) {
          filters = Array.isArray(request.filter)
            ? request.filter
            : [request.filter];
        }
        for (const filter of filters) {
          if (filter.kind) {
            filtered = filtered.filter(e => e.kind === filter.kind);
          }
          if (filter['spec.team']) {
            filtered = filtered.filter(e => e.spec?.team === filter['spec.team']);
          }
        }
        return { items: filtered, totalItems: filtered.length, pageInfo: {} };
      },
      getEntityByRef: async (entityRef, options) => {
        // Simple entity ref parsing: component:default/name
        const match = entityRef.match(/^component:default\/(.+)$/);
        if (match) {
          const name = match[1];
          return sampleCatalogEntities.find(e => e.metadata.name === name);
        }
        return undefined;
      },
      getEntityAncestors: async (entityRef, options) => {
        return { rootEntityRef: entityRef, items: [] };
      },
      queryEntities: async (request, options) => {
        let filtered = [...sampleCatalogEntities];
        let filters: Array<{ kind?: string; 'spec.team'?: string }> = [];
        if (request?.filter) {
          filters = Array.isArray(request.filter)
            ? request.filter
            : [request.filter];
        }
        for (const filter of filters) {
          if (filter.kind) {
            filtered = filtered.filter(e => e.kind === filter.kind);
          }
          if (filter['spec.team']) {
            filtered = filtered.filter(e => e.spec?.team === filter['spec.team']);
          }
        }
        return { items: filtered, totalItems: filtered.length, pageInfo: {} };
      },
      refreshEntity: async (entityRef, options) => {},
      getLocationByEntity: async (entityRef, options) => undefined,
      getLocationById: async (id, options) => undefined,
      addLocation: async (location, options) => ({
        location: { id: '', type: '', target: '' },
        entities: [],
      }),
      removeLocationById: async (id, options) => {},
      getEntitiesByRefs: async (request, options) => {
        const entityRefs = request.entityRefs ?? [];
        const items = entityRefs
          .map((ref: string) => {
            const match = ref.match(/^component:default\/(.+)$/);
            if (match) {
              const name = match[1];
              return sampleCatalogEntities.find(e => e.metadata.name === name);
            }
            return undefined;
          })
          .filter((e): e is typeof sampleCatalogEntities[0] => e !== undefined);
        return { items };
      },
    };
    return mockCatalogService;
  },
});

backend.add(mockCatalogServiceFactory);

// Add HypoStage plugin
backend.add(hypoStagePlugin);

backend.start();
