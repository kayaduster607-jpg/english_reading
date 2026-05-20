import type { AIProvider, AIReadingInput, AIReadingOutput } from '@/shared/types';
import { buildReadingPrompt } from './prompts';
import { validateAIOutput, sanitizeAIOutput } from './generated-reading.schema';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async generateReading(input: AIReadingInput): Promise<AIReadingOutput> {
    const prompt = buildReadingPrompt(input.examProfile, input.targetWords, input.topic);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一名专业的英语考试阅读材料命题老师。严格输出 JSON 格式，不要输出其他内容。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AI returned empty response');
    }

    const parsed = sanitizeAIOutput(content);

    if (!validateAIOutput(parsed)) {
      throw new Error('AI output failed schema validation');
    }

    return parsed;
  }
}
