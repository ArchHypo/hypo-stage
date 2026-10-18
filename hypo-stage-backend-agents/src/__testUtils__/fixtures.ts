import path from 'path';
import Knex, { Knex as KnexType } from 'knex';
import type { AgentsConfig } from '../config';

const BACKEND_MIGRATIONS = path.resolve(__dirname, '../../../hypo-stage-backend/migrations');
const AGENTS_MIGRATIONS = path.resolve(__dirname, '../../migrations');

/** In-memory SQLite with the hypo-stage backend schema plus the agents schema. */
export async function createTestDatabase(): Promise<KnexType> {
  const knex = Knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await knex.raw('PRAGMA foreign_keys = ON');
  await knex.migrate.latest({ directory: BACKEND_MIGRATIONS });
  await knex.migrate.latest({
    directory: AGENTS_MIGRATIONS,
    tableName: 'knex_migrations_hypo_stage_agents',
  });
  // Drop the backend's demo seed so tests control the data.
  await knex('hypothesis').del();
  return knex;
}

export const TEST_REPO = 'acme/payments';
export const PR_URL = 'https://github.com/acme/payments/pull/7';

export function testConfig(overrides: Partial<AgentsConfig> = {}): AgentsConfig {
  return {
    enabled: true,
    github: { apiToken: 'token', webhookSecret: 'secret', botLogin: 'hypostage-bot' },
    defaultModel: 'mock',
    confidenceThreshold: 0.7,
    maxCandidates: 5,
    providers: {},
    models: [
      { key: 'mock', provider: 'ollama', modelId: 'mock', maxInputChars: 20000, concurrency: 2 },
    ],
    repositories: [
      {
        repository: TEST_REPO,
        model: 'mock',
        confidenceThreshold: 0.7,
        issues: { triage: true, planIssues: true, labels: [], ignoreLabels: ['question'] },
      },
    ],
    issues: { debounceSeconds: 120, alertThreshold: 3 },
    coverage: { enabled: false, frequencyHours: 24, windowDays: 30, minIssues: 3, minOpenDays: 2 },
    coach: {
      enabled: false,
      model: 'mock',
      checkOnSave: true,
      fallback: { enabled: false, frequencyMinutes: 10, maxPerRun: 5, sinceDays: 7 },
    },
    planner: { enabled: false, model: 'mock', iterationDays: 14, maxActions: 4 },
    ...overrides,
  };
}

export async function insertHypothesis(
  knex: KnexType,
  values: Partial<Record<string, unknown>> & { id: string },
): Promise<void> {
  await knex('hypothesis').insert({
    entityRefs: JSON.stringify(['component:default/payments']),
    status: 'Open',
    statement: 'The payment gateway can process 1000 requests per second on one node',
    sourceType: 'Quality Attribute',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Performance']),
    uncertainty: 'High',
    impact: 'High',
    notes: null,
    ...values,
  });
}

export async function insertPlanning(
  knex: KnexType,
  values: Partial<Record<string, unknown>> & { id: string; hypothesisId: string },
): Promise<void> {
  await knex('technicalPlanning').insert({
    entityRef: 'component:default/payments',
    actionType: 'Spike',
    description: 'Load test the gateway client with connection pooling',
    expectedOutcome: 'Know the max throughput of a single node',
    documentations: JSON.stringify([]),
    targetDate: '2026-12-01',
    ...values,
  });
}

export function issueDetails(overrides: Partial<import('../github/client').IssueDetails> = {}) {
  return {
    repository: TEST_REPO,
    number: 12,
    url: `https://github.com/${TEST_REPO}/issues/12`,
    title: 'Checkout times out with ~800 concurrent users',
    body: 'During the sale, checkout requests time out after 30s.',
    state: 'open' as const,
    stateReason: null,
    author: 'fernando',
    labels: ['bug'],
    createdAt: '2026-09-20T10:00:00Z',
    closedAt: null,
    comments: 0,
    commentThread: [],
    reopened: 0,
    closingPullRequest: null,
    isPullRequest: false,
    ...overrides,
  };
}

/** Scripted structured-output model: `respond(system, prompt)` returns the JSON object. */
export function scriptedModel(respond: (system: string, prompt: string) => unknown) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MockLanguageModelV3 } = require('ai/test');
  return new MockLanguageModelV3({
    doGenerate: async (options: any) => {
      const system = options.prompt.find((m: any) => m.role === 'system')?.content ?? '';
      const prompt = JSON.stringify(options.prompt.filter((m: any) => m.role === 'user'));
      return {
        content: [{ type: 'text', text: JSON.stringify(respond(system, prompt)) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 5, text: 5, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}
