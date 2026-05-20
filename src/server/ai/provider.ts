import type { AIProvider } from '@/shared/types';
import { MockAIProvider } from './mock-provider';
import { OpenAIProvider } from './openai-provider';
import { DeepSeekProvider } from './deepseek-provider';

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.AI_PROVIDER || 'mock';

  switch (providerName) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is required');
      cachedProvider = new OpenAIProvider({ apiKey, model: process.env.OPENAI_MODEL });
      break;
    }
    case 'deepseek': {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required');
      cachedProvider = new DeepSeekProvider({ apiKey, model: process.env.DEEPSEEK_MODEL });
      break;
    }
    case 'mock':
    default:
      cachedProvider = new MockAIProvider();
      break;
  }

  return cachedProvider;
}
