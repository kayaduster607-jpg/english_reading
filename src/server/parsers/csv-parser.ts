import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';

export function parseCsv(content: string, fileName: string): VocabItem[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const wordIdx = findColumn(header, ['word', '单词', 'vocabulary']);
  const meaningIdx = findColumn(header, ['meaning', 'meaningcn', '中文', '释义', 'translation']);
  const posIdx = findColumn(header, ['pos', 'partofspeech', '词性']);
  const exampleIdx = findColumn(header, ['example', '例句']);

  if (wordIdx < 0 || meaningIdx < 0) {
    throw new Error('CSV must have "word" and "meaning" columns');
  }

  const items: VocabItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const word = cols[wordIdx]?.trim();
    const meaningCn = cols[meaningIdx]?.trim();

    if (!word || !meaningCn) continue;

    items.push({
      id: generateId(),
      word,
      pos: posIdx >= 0 ? cols[posIdx]?.trim() : undefined,
      meaningCn,
      example: exampleIdx >= 0 ? cols[exampleIdx]?.trim() : undefined,
      examTags: [],
      difficulty: 2,
      source: fileName,
    });
  }

  return items;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h === candidate || h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}
