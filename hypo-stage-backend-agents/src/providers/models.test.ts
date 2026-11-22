import { ConfigReader } from '@backstage/config';
import { generateText, Output, wrapLanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import { readAgentsConfig } from '../config';
import { createModelRegistry, SCHEMA_INSTRUCTION, schemaInPromptMiddleware } from './models';

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

const TestSchema = z.object({
  candidates: z.array(z.object({ hypothesisId: z.string().describe('id of a listed hypothesis') })),
});

function mockModel(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    }),
  });
}

describe('schemaInPromptMiddleware', () => {
  it('appends the output schema to the system message and keeps the response format', async () => {
    const inner = mockModel('{"candidates":[]}');
    await generateText({
      model: wrapLanguageModel({ model: inner, middleware: schemaInPromptMiddleware }),
      system: 'SYSTEM PROMPT',
      prompt: 'user prompt',
      output: Output.object({ schema: TestSchema }),
    });
    const call = inner.doGenerateCalls[0];
    expect(call.prompt[0].role).toBe('system');
    const system = call.prompt[0].content as string;
    expect(system.startsWith('SYSTEM PROMPT\n\n')).toBe(true);
    expect(system).toContain(SCHEMA_INSTRUCTION);
    expect(system).toContain('"hypothesisId"');
    expect(system).toContain('id of a listed hypothesis');
    expect(call.prompt).toHaveLength(2);
    expect(call.responseFormat).toMatchObject({ type: 'json' });
  });

  it('adds a system message when there is none', async () => {
    const inner = mockModel('{"candidates":[]}');
    await generateText({
      model: wrapLanguageModel({ model: inner, middleware: schemaInPromptMiddleware }),
      prompt: 'user prompt',
      output: Output.object({ schema: TestSchema }),
    });
    const call = inner.doGenerateCalls[0];
    expect(call.prompt[0]).toMatchObject({ role: 'system' });
    expect(call.prompt[0].content as string).toContain(SCHEMA_INSTRUCTION);
    expect(call.prompt[1].role).toBe('user');
  });

  it('leaves text calls unchanged', async () => {
    const inner = mockModel('hello');
    await generateText({
      model: wrapLanguageModel({ model: inner, middleware: schemaInPromptMiddleware }),
      system: 'SYSTEM PROMPT',
      prompt: 'user prompt',
    });
    expect(inner.doGenerateCalls[0].prompt[0]).toEqual({ role: 'system', content: 'SYSTEM PROMPT' });
  });
});

describe('schema in the HTTP request', () => {
  const realFetch = globalThis.fetch;
  let bodies: string[];

  function mockFetch(response: () => Response) {
    bodies = [];
    globalThis.fetch = jest.fn(async (_url: any, init?: any) => {
      bodies.push(String(init?.body ?? ''));
      return response();
    }) as any;
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const cfg = config({
    models,
    providers: { anthropic: { apiKey: 'a' }, openai: { apiKey: 'o' }, google: { apiKey: 'g' } },
  });
  const registry = createModelRegistry(cfg);
  const call = (key: string) =>
    generateText({
      model: registry.resolve(cfg.models.find(m => m.key === key)!),
      system: 'SYSTEM PROMPT',
      prompt: 'user prompt',
      output: Output.object({ schema: TestSchema }),
      maxRetries: 0,
    });

  it('sends the schema in the messages and in response_format for the ollama provider', async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            id: 'x',
            object: 'chat.completion',
            created: 0,
            model: 'qwen2.5:7b',
            choices: [{ index: 0, message: { role: 'assistant', content: '{"candidates":[]}' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    await call('local');
    const body = JSON.parse(bodies[0]);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain(SCHEMA_INSTRUCTION);
    expect(body.messages[0].content).toContain('id of a listed hypothesis');
    expect(body.response_format.type).toBe('json_schema');
  });

  it.each(['claude', 'gpt', 'gemini'])('does not change the messages for %s', async key => {
    mockFetch(() => new Response('{"error":"test"}', { status: 400, headers: { 'content-type': 'application/json' } }));
    await expect(call(key)).rejects.toThrow();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('SYSTEM PROMPT');
    expect(bodies[0]).not.toContain(SCHEMA_INSTRUCTION.slice(0, 40));
  });
});
