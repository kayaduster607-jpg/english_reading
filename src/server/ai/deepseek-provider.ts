import type { AIProvider, AIReadingInput, AIReadingOutput } from '@/shared/types';
import { buildReadingPrompt } from './prompts';
import { sanitizeAIOutput, validateAIOutput } from './generated-reading.schema';

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-v4-flash';
  }

  async generateReading(input: AIReadingInput): Promise<AIReadingOutput> {
    const prompt = buildReadingPrompt(input.examProfile, input.targetWords, input.topic);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
            content: '你是一名专业的英语等级考试阅读材料命题老师。你必须输出合法 JSON，不要输出 Markdown，不要输出解释性文字。',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 9000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek returned empty response');
    }

    const parsed = sanitizeAIOutput(content);

    if (!validateAIOutput(parsed)) {
      throw new Error('DeepSeek output failed schema validation');
    }

    return parsed;
  }
}
