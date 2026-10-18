import type { LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AgentsConfig, ModelDefinition, ProviderName } from '../config';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

type ProviderFactory = (modelId: string) => LanguageModel;

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
      // Ollama exposes an OpenAI-compatible API with json_schema response formats.
      const ollama = createOpenAICompatible({
        name: 'ollama',
        baseURL: settings?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
        apiKey: settings?.apiKey,
        supportsStructuredOutputs: true,
      });
      return modelId => ollama.chatModel(modelId);
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
