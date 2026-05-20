import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';

export function parseTxt(content: string, fileName: string): VocabItem[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const items: VocabItem[] = [];

  for (const line of lines) {
    // Skip comment lines
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Try different separators: tab, comma, pipe
    const parts = line.includes('\t')
      ? line.split('\t')
      : line.includes('|')
        ? line.split('|')
        : line.split(',');

    if (parts.length < 2) continue;

    const word = parts[0].trim();
    const meaningCn = parts[1].trim();
    const pos = parts[2]?.trim() || '';
    const example = parts[3]?.trim() || '';

    if (!word || !meaningCn) continue;

    items.push({
      id: generateId(),
      word,
      pos: pos || undefined,
      meaningCn,
      example: example || undefined,
      examTags: [],
      difficulty: 2,
      source: fileName,
    });
  }

  return items;
}
