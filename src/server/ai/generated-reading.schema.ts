import type { AIReadingOutput } from '@/shared/types';

export function validateAIOutput(data: unknown): data is AIReadingOutput {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.topic !== 'string') return false;
  if (typeof obj.title !== 'string') return false;
  if (typeof obj.guideCn !== 'string') return false;
  if (!Array.isArray(obj.paragraphs)) return false;
  if (!Array.isArray(obj.translationCn)) return false;
  if (!Array.isArray(obj.vocabularyInContext)) return false;
  if (!Array.isArray(obj.questions)) return false;
  if (!Array.isArray(obj.cloze)) return false;

  // translationCn length must match paragraphs
  if (obj.translationCn.length !== obj.paragraphs.length) return false;

  // Validate questions have required fields
  for (const q of obj.questions as Record<string, unknown>[]) {
    if (typeof q.id !== 'string') return false;
    if (typeof q.question !== 'string') return false;
    if (!Array.isArray(q.options)) return false;
    if (typeof q.answer !== 'string') return false;
  }

  // Validate vocabularyInContext
  for (const v of obj.vocabularyInContext as Record<string, unknown>[]) {
    if (typeof v.word !== 'string') return false;
    if (typeof v.sentence !== 'string') return false;
    if (typeof v.meaningCn !== 'string') return false;
  }

  return true;
}

export function sanitizeAIOutput(raw: string): unknown {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}
