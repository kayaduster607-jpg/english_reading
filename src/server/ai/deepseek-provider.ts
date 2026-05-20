import { OpenAIProvider } from './openai-provider';

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config: { apiKey: string; model?: string }) {
    super({
      apiKey: config.apiKey,
      model: config.model || 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
    });
  }
}
