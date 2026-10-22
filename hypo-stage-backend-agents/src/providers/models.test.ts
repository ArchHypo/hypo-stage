import { ConfigReader } from '@backstage/config';
import { readAgentsConfig } from '../config';
import { createModelRegistry } from './models';

function config(agents: object) {
  return readAgentsConfig(new ConfigReader({ hypoStage: { agents } }));
}

const models = [
  { key: 'claude', provider: 'anthropic', modelId: 'claude-sonnet-5' },
  { key: 'gpt', provider: 'openai', modelId: 'gpt-5-mini' },
  { key: 'gemini', provider: 'google', modelId: 'gemini-2.5-flash-lite' },
  { key: 'local', provider: 'ollama', modelId: 'qwen2.5:7b' },
];

describe('createModelRegistry', () => {
  it('resolves every supported provider', () => {
    const cfg = config({
      models,
      providers: {
        anthropic: { apiKey: 'a' },
        openai: { apiKey: 'o' },
        google: { apiKey: 'g' },
        ollama: { baseUrl: 'http://localhost:11434/v1' },
      },
    });
    const registry = createModelRegistry(cfg);
    const resolved = cfg.models.map(m => registry.resolve(m));
    expect(resolved.map(m => (typeof m === 'string' ? m : m.modelId))).toEqual([
      'claude-sonnet-5',
      'gpt-5-mini',
      'gemini-2.5-flash-lite',
      'qwen2.5:7b',
    ]);
  });

  it('fails clearly when an api key is missing', () => {
    const cfg = config({ models });
    const registry = createModelRegistry(cfg);
    expect(() => registry.resolve(cfg.models[0])).toThrow(
      'hypoStage.agents.providers.anthropic.apiKey is not configured',
    );
    // Ollama does not need a key
    expect(() => registry.resolve(cfg.models[3])).not.toThrow();
  });
});

describe('readAgentsConfig', () => {
  it('applies defaults and provider-specific budgets', () => {
    const cfg = config({
      enabled: true,
      defaultModel: 'local',
      models,
      repositories: [{ repository: 'acme/app' }],
    });
    expect(cfg.repositories).toEqual([
      {
        repository: 'acme/app',
        model: 'local',
        confidenceThreshold: 0.7,
        issues: { triage: false, planIssues: false, labels: [], ignoreLabels: ['question', 'duplicate', 'invalid'] },
      },
    ]);
    expect(cfg.models.find(m => m.key === 'local')).toMatchObject({
      maxInputChars: 12000,
      concurrency: 1,
    });
  });

  it('rejects unknown providers and model keys', () => {
    expect(() => config({ models: [{ key: 'x', provider: 'azure', modelId: 'm' }] })).toThrow(
      /unsupported provider 'azure'/,
    );
    expect(() =>
      config({ models, repositories: [{ repository: 'acme/app', model: 'nope' }] }),
    ).toThrow(/unknown model key 'nope'/);
  });
});
