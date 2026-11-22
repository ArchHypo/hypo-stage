import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AgentsConfig, ModelDefinition, ProviderName } from '../config';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

type ProviderFactory = (modelId: string) => LanguageModel;

export const SCHEMA_INSTRUCTION =
  'Answer with one JSON object that matches the JSON schema below. ' +
  'The field descriptions in the schema explain what each value means.';

/**
 * Puts the output schema in the system message of every structured call. OpenAI-compatible
 * servers (Ollama, vLLM, OpenRouter backends) often enforce `response_format` by constraining
 * the output without showing the schema to the model, which then cannot know the expected
 * fields and may fall back to the shortest valid object (for example an empty list). The
 * `response_format` is kept, so the server still constrains the output.
 */
export const schemaInPromptMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    const format = params.responseFormat;
    if (format?.type !== 'json' || !format.schema) return params;
    const instruction = `${SCHEMA_INSTRUCTION}\n${JSON.stringify(format.schema)}`;
    const [first, ...rest] = params.prompt;
    const prompt: typeof params.prompt =
      first?.role === 'system'
        ? [{ ...first, content: `${first.content}\n\n${instruction}` }, ...rest]
        : [{ role: 'system', content: instruction }, ...params.prompt];
    return { ...params, prompt };
  },
};

function requireApiKey(config: AgentsConfig, provider: ProviderName): string {
  const apiKey = config.providers[provider]?.apiKey;
  if (!apiKey) {
    throw new Error(`hypoStage.agents.providers.${provider}.apiKey is not configured`);
  }
  return apiKey;
}

function createProvider(config: AgentsConfig, provider: ProviderName): ProviderFactory {
  const settings = config.providers[provider];
  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: requireApiKey(config, provider),
        baseURL: settings?.baseUrl,
      });
      return modelId => anthropic(modelId);
    }
    case 'openai': {
      const openai = createOpenAI({
        apiKey: requireApiKey(config, provider),
        baseURL: settings?.baseUrl,
      });
      return modelId => openai(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: requireApiKey(config, provider),
        baseURL: settings?.baseUrl,
      });
      return modelId => google(modelId);
    }
    case 'ollama': {
      // Ollama exposes an OpenAI-compatible API with json_schema response formats. The schema is
      // also put in the prompt, since these servers may not show it to the model.
      const ollama = createOpenAICompatible({
        name: 'ollama',
        baseURL: settings?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
        apiKey: settings?.apiKey,
        supportsStructuredOutputs: true,
      });
      return modelId => wrapLanguageModel({ model: ollama.chatModel(modelId), middleware: schemaInPromptMiddleware });
    }
    default:
      throw new Error(`Unsupported provider '${provider satisfies never}'`);
  }
}

export interface ModelRegistry {
  resolve(model: ModelDefinition): LanguageModel;
}

export function createModelRegistry(config: AgentsConfig): ModelRegistry {
  const providers = new Map<ProviderName, ProviderFactory>();
  return {
    resolve(model) {
      let factory = providers.get(model.provider);
      if (!factory) {
        factory = createProvider(config, model.provider);
        providers.set(model.provider, factory);
      }
      return factory(model.modelId);
    },
  };
}
