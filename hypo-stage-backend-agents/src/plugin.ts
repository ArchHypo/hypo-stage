import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { runCoachFallback } from './coach/fallback';
import { runCoverage } from './uncovered/run';
import { readAgentsConfig } from './config';
import { createGitHubClient } from './github/client';
import { createModelRegistry } from './providers/models';
import { createPgBoss } from './queue/boss';
import {
  createEnqueue,
  createIssueEnqueue,
  EnqueueAnalyzePr,
  EnqueueIssue,
  registerWorker,
} from './queue/worker';
import { createRouter, WEBHOOK_PATH } from './router';
import type { PipelineDeps } from './pipeline/run';

const GITHUB_SLUG_ANNOTATION = 'github.com/project-slug';

/**
 * Adds AI analysis of GitHub pull requests to the hypo-stage plugin. It shares the
 * plugin's database, reads hypotheses and technical plannings, and stores suggestions
 * in its own tables.
 *
 * @public
 */
export const hypoStageAgentsModule = createBackendModule({
  pluginId: 'hypo-stage',
  moduleId: 'agents',
  register(reg) {
    reg.registerInit({
      deps: {
        database: coreServices.database,
        logger: coreServices.logger,
        rootConfig: coreServices.rootConfig,
        lifecycle: coreServices.lifecycle,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        auth: coreServices.auth,
        catalog: catalogServiceRef,
        scheduler: coreServices.scheduler,
      },
      async init({
        database,
        logger,
        rootConfig,
        lifecycle,
        httpRouter,
        httpAuth,
        auth,
        catalog,
        scheduler,
      }) {
        const knex = await database.getClient();

        if (!database.migrations?.skip) {
          // Modules initialize before their plugin, so the hypo-stage tables this module
          // references may not exist yet on a fresh database. Running the plugin's
          // migrations first is idempotent: the plugin finds nothing left to do.
          await knex.migrate.latest({
            directory: resolvePackagePath('@archhypo/plugin-hypo-stage-backend', 'migrations'),
          });
          await knex.migrate.latest({
            directory: resolvePackagePath('@archhypo/plugin-hypo-stage-backend-agents', 'migrations'),
            tableName: 'knex_migrations_hypo_stage_agents',
          });
        }

        const config = readAgentsConfig(rootConfig);

        const models = createModelRegistry(config);
        const deps: PipelineDeps = {
          knex,
          logger,
          config,
          github: createGitHubClient({ token: config.github.apiToken }),
          models,
          async resolveRepositoryEntityRefs(repository) {
            const { items } = await catalog.getEntities(
              {
                filter: { [`metadata.annotations.${GITHUB_SLUG_ANNOTATION}`]: repository },
                fields: ['kind', 'metadata.namespace', 'metadata.name'],
              },
              { credentials: await auth.getOwnServiceCredentials() },
            );
            return items.map(entity => stringifyEntityRef(entity));
          },
        };

        let enqueueAnalyzePr: EnqueueAnalyzePr | undefined;
        let enqueueIssue: EnqueueIssue | undefined;
        if (['pg', 'postgres', 'postgresql'].includes(String(knex.client.config.client))) {
          const boss = await createPgBoss({ knex, logger });
          lifecycle.addShutdownHook(async () => {
            await boss.stop({ graceful: true });
          });
          // PR analysis checks agents.enabled itself; issue flows are enabled per repository.
          if (config.enabled || config.repositories.some(r => r.issues.triage || r.issues.planIssues)) {
            await registerWorker(boss, deps);
          }
          enqueueAnalyzePr = createEnqueue(boss);
          enqueueIssue = createIssueEnqueue(boss, config.issues.debounceSeconds);
        } else {
          logger.warn(
            'HypoStage agents need PostgreSQL for pg-boss; pull request webhooks will be rejected',
          );
        }

        if (config.coach.enabled && config.coach.fallback.enabled) {
          await scheduler.scheduleTask({
            id: 'hypo-stage-agents-coach-fallback',
            frequency: { minutes: config.coach.fallback.frequencyMinutes },
            timeout: { minutes: 5 },
            initialDelay: { minutes: 1 },
            scope: 'global',
            fn: async () => {
              await runCoachFallback({ knex, logger, config, models });
            },
          });
        }

        if (config.coverage.enabled) {
          await scheduler.scheduleTask({
            id: 'hypo-stage-agents-coverage',
            frequency: { hours: config.coverage.frequencyHours },
            timeout: { minutes: 15 },
            initialDelay: { minutes: 2 },
            scope: 'global',
            fn: async () => {
              await runCoverage({
                knex,
                logger,
                config,
                models,
                resolveRepositoryEntityRefs: deps.resolveRepositoryEntityRefs,
              });
            },
          });
        }

        httpRouter.addAuthPolicy({ path: WEBHOOK_PATH, allow: 'unauthenticated' });
        const describeComponents = async (entityRefs: string[]) => {
          const { items } = await catalog.getEntitiesByRefs(
            {
              entityRefs,
              fields: ['kind', 'metadata.namespace', 'metadata.name', 'metadata.description', 'spec.system'],
            },
            { credentials: await auth.getOwnServiceCredentials() },
          );
          return items.flatMap(entity =>
            entity
              ? [
                  {
                    entityRef: stringifyEntityRef(entity),
                    description: entity.metadata.description ?? null,
                    system: typeof entity.spec?.system === 'string' ? entity.spec.system : null,
                  },
                ]
              : [],
          );
        };

        httpRouter.use(
          await createRouter({
            knex,
            config,
            logger,
            httpAuth,
            enqueueAnalyzePr,
            models,
            describeComponents,
            enqueueIssue,
            github: deps.github,
            resolveEntityRepository: async entityRef => {
              const entity = await catalog.getEntityByRef(entityRef, {
                credentials: await auth.getOwnServiceCredentials(),
              });
              return entity?.metadata.annotations?.[GITHUB_SLUG_ANNOTATION] ?? null;
            },
          }),
        );

        logger.info('HypoStage agents module initialized', {
          enabled: config.enabled,
          repositories: config.repositories.length,
          models: config.models.map(m => `${m.key}=${m.provider}:${m.modelId}`),
          coach: config.coach.enabled ? config.coach.model : 'disabled',
          planner: config.planner.enabled ? config.planner.model : 'disabled',
        });
      },
    });
  },
});
