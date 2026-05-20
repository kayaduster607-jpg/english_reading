import type { AIProvider } from '@/shared/types';
import { DeepSeekProvider } from './deepseek-provider';
import { MockAIProvider } from './mock-provider';

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.AI_PROVIDER || 'mock';

  if (providerName === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required');
    cachedProvider = new DeepSeekProvider({
      apiKey,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    });
  } else {
    cachedProvider = new MockAIProvider();
  }

  return cachedProvider;
}
