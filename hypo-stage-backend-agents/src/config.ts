import type { Config } from '@backstage/config';

export const PROVIDERS = ['anthropic', 'openai', 'google', 'ollama'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export interface ModelDefinition {
  key: string;
  provider: ProviderName;
  modelId: string;
  /** Character budget for PR content sent to the model. */
  maxInputChars: number;
  /** Max parallel assessment calls for this model. */
  concurrency: number;
}

export interface RepositoryIssuesConfig {
  /** Flow 1: analyze human issues against hypotheses. */
  triage: boolean;
  /** Flow 3: open technical plannings as issues in this repository. */
  planIssues: boolean;
  /** Only triage issues carrying one of these labels (empty = all). */
  labels: string[];
  ignoreLabels: string[];
}

export interface RepositoryDefinition {
  repository: string;
  model: string;
  confidenceThreshold: number;
  issues: RepositoryIssuesConfig;
}

export interface IssuesConfig {
  debounceSeconds: number;
  /** Related human issues with the same evidence type before an evidence alert. */
  alertThreshold: number;
}

export interface CoverageConfig {
  enabled: boolean;
  frequencyHours: number;
  windowDays: number;
  minIssues: number;
  minOpenDays: number;
}

export interface ProviderSettings {
  apiKey?: string;
  baseUrl?: string;
}

export interface CoachConfig {
  enabled: boolean;
  /** Model key from `models`. */
  model: string | null;
  checkOnSave: boolean;
  fallback: {
    enabled: boolean;
    frequencyMinutes: number;
    maxPerRun: number;
    sinceDays: number;
  };
}

export interface PlannerConfig {
  enabled: boolean;
  /** Model key from `models`. */
  model: string | null;
  iterationDays: number;
  maxActions: number;
}

export interface AgentsConfig {
  enabled: boolean;
  github: {
    apiToken?: string;
    webhookSecret?: string;
    /** Login of the account behind apiToken; resolved from the token when unset. */
    botLogin?: string;
  };
  issues: IssuesConfig;
  coverage: CoverageConfig;
  defaultModel?: string;
  confidenceThreshold: number;
  maxCandidates: number;
  providers: Partial<Record<ProviderName, ProviderSettings>>;
  models: ModelDefinition[];
  repositories: RepositoryDefinition[];
  coach: CoachConfig;
  planner: PlannerConfig;
}

const DEFAULT_MAX_INPUT_CHARS = 60_000;
const DEFAULT_OLLAMA_MAX_INPUT_CHARS = 12_000;

function readProvider(config: Config | undefined): ProviderSettings | undefined {
  if (!config) {
    return undefined;
  }
  return {
    apiKey: config.getOptionalString('apiKey'),
    baseUrl: config.getOptionalString('baseUrl'),
  };
}

export function readAgentsConfig(root: Config): AgentsConfig {
  const hypoStage = root.getOptionalConfig('hypoStage');
  const agents = hypoStage?.getOptionalConfig('agents');
  const github = hypoStage?.getOptionalConfig('github');

  const confidenceThreshold = agents?.getOptionalNumber('confidenceThreshold') ?? 0.7;

  const providersConfig = agents?.getOptionalConfig('providers');
  const providers: AgentsConfig['providers'] = {};
  for (const name of PROVIDERS) {
    const settings = readProvider(providersConfig?.getOptionalConfig(name));
    if (settings) {
      providers[name] = settings;
    }
  }

  const models: ModelDefinition[] = (agents?.getOptionalConfigArray('models') ?? []).map(m => {
    const provider = m.getString('provider');
    if (!(PROVIDERS as readonly string[]).includes(provider)) {
      throw new Error(
        `hypoStage.agents.models: unsupported provider '${provider}', expected one of ${PROVIDERS.join(', ')}`,
      );
    }
    return {
      key: m.getString('key'),
      provider: provider as ProviderName,
      modelId: m.getString('modelId'),
      maxInputChars:
        m.getOptionalNumber('maxInputChars') ??
        (provider === 'ollama' ? DEFAULT_OLLAMA_MAX_INPUT_CHARS : DEFAULT_MAX_INPUT_CHARS),
      concurrency: m.getOptionalNumber('concurrency') ?? (provider === 'ollama' ? 1 : 3),
    };
  });

  const defaultModel = agents?.getOptionalString('defaultModel');

  const repositories: RepositoryDefinition[] = (
    agents?.getOptionalConfigArray('repositories') ?? []
  ).map(r => {
    const model = r.getOptionalString('model') ?? defaultModel;
    if (!model) {
      throw new Error(
        `hypoStage.agents.repositories: '${r.getString('repository')}' has no model and no defaultModel is set`,
      );
    }
    const issues = r.getOptionalConfig('issues');
    return {
      repository: r.getString('repository'),
      model,
      confidenceThreshold: r.getOptionalNumber('confidenceThreshold') ?? confidenceThreshold,
      issues: {
        triage: issues?.getOptionalBoolean('triage') ?? false,
        planIssues: issues?.getOptionalBoolean('planIssues') ?? false,
        labels: issues?.getOptionalStringArray('labels') ?? [],
        ignoreLabels: issues?.getOptionalStringArray('ignoreLabels') ?? ['question', 'duplicate', 'invalid'],
      },
    };
  });

  for (const repo of repositories) {
    if (!models.some(m => m.key === repo.model)) {
      throw new Error(
        `hypoStage.agents.repositories: '${repo.repository}' references unknown model key '${repo.model}'`,
      );
    }
  }

  const coachConfig = agents?.getOptionalConfig('coach');
  const fallbackConfig = coachConfig?.getOptionalConfig('fallback');
  const coach: CoachConfig = {
    enabled: coachConfig?.getOptionalBoolean('enabled') ?? false,
    model: coachConfig?.getOptionalString('model') ?? defaultModel ?? null,
    checkOnSave: coachConfig?.getOptionalBoolean('checkOnSave') ?? false,
    fallback: {
      enabled: fallbackConfig?.getOptionalBoolean('enabled') ?? false,
      frequencyMinutes: fallbackConfig?.getOptionalNumber('frequencyMinutes') ?? 10,
      maxPerRun: fallbackConfig?.getOptionalNumber('maxPerRun') ?? 5,
      sinceDays: fallbackConfig?.getOptionalNumber('sinceDays') ?? 7,
    },
  };
  if (coach.enabled) {
    requireConfiguredModel(models, coach.model, 'hypoStage.agents.coach');
  }

  const plannerConfig = agents?.getOptionalConfig('planner');
  const planner: PlannerConfig = {
    enabled: plannerConfig?.getOptionalBoolean('enabled') ?? false,
    model: plannerConfig?.getOptionalString('model') ?? defaultModel ?? null,
    iterationDays: plannerConfig?.getOptionalNumber('iterationDays') ?? 14,
    maxActions: plannerConfig?.getOptionalNumber('maxActions') ?? 4,
  };
  if (planner.enabled) {
    requireConfiguredModel(models, planner.model, 'hypoStage.agents.planner');
  }

  return {
    enabled: agents?.getOptionalBoolean('enabled') ?? false,
    github: {
      apiToken: github?.getOptionalString('apiToken'),
      webhookSecret: github?.getOptionalString('webhookSecret'),
      botLogin: github?.getOptionalString('botLogin'),
    },
    issues: {
      debounceSeconds: agents?.getOptionalNumber('issues.debounceSeconds') ?? 120,
      alertThreshold: agents?.getOptionalNumber('issues.alertThreshold') ?? 3,
    },
    coverage: {
      enabled: agents?.getOptionalBoolean('coverage.enabled') ?? false,
      frequencyHours: agents?.getOptionalNumber('coverage.frequencyHours') ?? 24,
      windowDays: agents?.getOptionalNumber('coverage.windowDays') ?? 30,
      minIssues: agents?.getOptionalNumber('coverage.minIssues') ?? 3,
      minOpenDays: agents?.getOptionalNumber('coverage.minOpenDays') ?? 2,
    },
    defaultModel,
    confidenceThreshold,
    maxCandidates: agents?.getOptionalNumber('maxCandidates') ?? 5,
    providers,
    models,
    repositories,
    coach,
    planner,
  };
}

function requireConfiguredModel(models: ModelDefinition[], key: string | null, label: string): void {
  if (!key) {
    throw new Error(`${label}: set a model or agents.defaultModel`);
  }
  if (!models.some(m => m.key === key)) {
    throw new Error(`${label}: unknown model key '${key}'`);
  }
}

/** Pull-request analysis and issue flows are the only work that needs pg-boss. */
export function agentsQueueNeeded(config: AgentsConfig): boolean {
  return config.enabled || config.repositories.some(repo => repo.issues.triage || repo.issues.planIssues);
}

/**
 * Which flows can actually run. A config flag alone is not enough: the UI hides a
 * control until this is true for that flow.
 */
export interface AgentsReadiness {
  coach: boolean;
  planner: boolean;
  pullRequests: boolean;
  triage: boolean;
  planIssues: boolean;
  coverage: boolean;
}

function modelCanBeCalled(config: AgentsConfig, key: string | null | undefined): boolean {
  if (!key) return false;
  const model = config.models.find(item => item.key === key);
  if (!model) return false;
  if (model.provider === 'ollama') return true;
  return Boolean(config.providers[model.provider]?.apiKey);
}

/** GitHub flows need a token and a webhook secret before the UI offers them. */
function githubConnected(config: AgentsConfig): boolean {
  return Boolean(config.github.apiToken && config.github.webhookSecret);
}

export function agentsReadiness(config: AgentsConfig, queue: boolean): AgentsReadiness {
  const coach = config.coach.enabled && modelCanBeCalled(config, config.coach.model);
  const planner = config.planner.enabled && modelCanBeCalled(config, config.planner.model);
  const github = githubConnected(config);
  const triage = queue && github && config.repositories.some(repo => repo.issues.triage && modelCanBeCalled(config, repo.model));
  const planIssues = queue && github && config.repositories.some(repo => repo.issues.planIssues && modelCanBeCalled(config, repo.model));
  const pullRequests = queue && github && config.enabled && config.repositories.some(repo => modelCanBeCalled(config, repo.model));
  const coverage = config.coverage.enabled && triage && modelCanBeCalled(config, config.defaultModel);
  return { coach, planner, pullRequests, triage, planIssues, coverage };
}

export function findRepository(
  config: AgentsConfig,
  repository: string,
): RepositoryDefinition | undefined {
  const needle = repository.toLowerCase();
  return config.repositories.find(r => r.repository.toLowerCase() === needle);
}

export function findModel(config: AgentsConfig, key: string): ModelDefinition {
  const model = config.models.find(m => m.key === key);
  if (!model) {
    throw new Error(`Unknown model key '${key}' in hypoStage.agents.models`);
  }
  return model;
}
