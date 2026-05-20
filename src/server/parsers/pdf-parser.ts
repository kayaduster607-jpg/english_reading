import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';
import type { VocabParserInput, VocabParseResult } from './parser-factory';

export async function parsePdf(input: VocabParserInput): Promise<VocabParseResult> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(input.buffer);
  const rawText = normalizePdfText(data.text || '');
  const warnings: string[] = [];

  if (rawText.trim().length < 100) {
    warnings.push('这个 PDF 几乎没有可提取的文字层，可能是扫描版 PDF。当前版本需要上传可复制文字的 PDF。');
    return { items: [], warnings, rawTextPreview: rawText.slice(0, 2000) };
  }

  const items = parseVocabText(rawText, input.fileName);

  if (items.length === 0) {
    warnings.push('已提取到 PDF 文字，但没有识别出有效单词条目。可能是排版复杂或格式不标准。');
  }

  return { items, warnings, rawTextPreview: rawText.slice(0, 2000) };
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseVocabText(text: string, fileName: string): VocabItem[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const items: VocabItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // Try to match: word /phonetic/ pos meaning
    // or: word pos meaning
    // or: word meaning
    const match = trimmed.match(
      /^([A-Za-z][A-Za-z''\-\s]{0,40})\s*(?:\/[^/]*\/)?\s*(?:(?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.)\s*)?(.+)$/
    );

    if (!match) continue;

    const word = match[1].trim();
    const rest = match[2].trim();

    // Check if rest contains Chinese
    if (!/[一-鿿]/.test(rest)) continue;

    // Extract pos if present in rest
    const posMatch = rest.match(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.)\s*(.*)/);
    let pos = '';
    let meaningCn = rest;

    if (posMatch) {
      pos = posMatch[1];
      meaningCn = posMatch[2].trim();
    }

    if (!isValidWord(word)) continue;

    items.push({
      id: generateId(),
      word,
      pos: pos || undefined,
      meaningCn,
      examTags: [],
      difficulty: 2,
      source: fileName,
    });
  }

  // Dedupe
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isValidWord(word: string): boolean {
  if (!word || word.length > 60) return false;
  return /^[A-Za-z][A-Za-z''\-\s]+$/.test(word);
}
