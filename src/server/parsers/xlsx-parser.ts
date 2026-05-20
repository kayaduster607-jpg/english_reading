import * as XLSX from 'xlsx';
import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';
import type { VocabParserInput, VocabParseResult } from './parser-factory';

type Row = string[];

export async function parseExcel(input: VocabParserInput): Promise<VocabParseResult> {
  const workbook = XLSX.read(input.buffer, { type: 'buffer', cellText: true, cellDates: false });

  const items: VocabItem[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: '', raw: false });
    items.push(...parseRows(rows, input.fileName));
  }

  const deduped = dedupe(items);

  if (deduped.length === 0) {
    warnings.push('Excel 中没有识别出有效单词。请确认表格里至少有"单词"和"中文释义"两列。');
  }

  return { items: deduped, warnings };
}

function parseRows(rows: Row[], fileName: string): VocabItem[] {
  const normalized = rows
    .map((row) => row.map((cell) => String(cell || '').trim()))
    .filter((row) => row.some(Boolean));

  if (normalized.length === 0) return [];

  const headerInfo = detectHeader(normalized);
  if (!headerInfo) return parseWithoutHeader(normalized, fileName);

  const { headerRowIndex, wordIdx, meaningIdx, posIdx, exampleIdx } = headerInfo;
  const result: VocabItem[] = [];

  for (let i = headerRowIndex + 1; i < normalized.length; i++) {
    const row = normalized[i];
    const word = cleanWord(row[wordIdx]);
    const meaningCn = row[meaningIdx]?.trim();
    const pos = posIdx >= 0 ? row[posIdx]?.trim() : '';
    const example = exampleIdx >= 0 ? row[exampleIdx]?.trim() : '';

    if (!isValidWord(word)) continue;
    if (!meaningCn || !/[一-鿿]/.test(meaningCn)) continue;

    result.push({
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

  return result;
}

function detectHeader(rows: Row[]) {
  const maxSearch = Math.min(rows.length, 5);

  for (let i = 0; i < maxSearch; i++) {
    const header = rows[i].map((c) => normalize(c));

    const wordIdx = findIdx(header, ['word', 'vocabulary', 'english', 'term', '单词', '词汇', '英文', '词条']);
    const meaningIdx = findIdx(header, ['meaning', 'meaningcn', 'translation', 'definition', '释义', '中文', '中文释义', '含义', '意思']);
    const posIdx = findIdx(header, ['pos', 'partofspeech', '词性']);
    const exampleIdx = findIdx(header, ['example', 'sentence', '例句']);

    if (wordIdx >= 0 && meaningIdx >= 0) {
      return { headerRowIndex: i, wordIdx, meaningIdx, posIdx, exampleIdx };
    }
  }
  return null;
}

function parseWithoutHeader(rows: Row[], fileName: string): VocabItem[] {
  const result: VocabItem[] = [];

  for (const row of rows) {
    const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    const wordCell = nonEmpty.find((c) => isValidWord(cleanWord(c)));
    const meaningCell = nonEmpty.find((c) => /[一-鿿]/.test(c));
    if (!wordCell || !meaningCell) continue;

    const word = cleanWord(wordCell);
    const meaningCn = meaningCell.trim();
    if (!word || !meaningCn) continue;

    result.push({
      id: generateId(),
      word,
      meaningCn,
      examTags: [],
      difficulty: 2,
      source: fileName,
    });
  }
  return result;
}

function normalize(v: string): string {
  return String(v || '').toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '').trim();
}

function findIdx(header: string[], candidates: string[]): number {
  return header.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));
}

function cleanWord(v: string): string {
  return String(v || '').replace(/^[\d.、)\]]+/, '').replace(/[，,;；:：。]+$/g, '').replace(/\s+/g, ' ').trim();
}

function isValidWord(word: string): boolean {
  if (!word || word.length > 60) return false;
  return /^[A-Za-z][A-Za-z''.\\-\\s]+$/.test(word);
}

function dedupe(items: VocabItem[]): VocabItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
