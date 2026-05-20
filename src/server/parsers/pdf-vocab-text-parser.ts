import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';

const POS_VALUES = [
  'n', 'v', 'vt', 'vi', 'adj', 'adv', 'prep',
  'conj', 'pron', 'num', 'interj', 'abbr', 'phr',
];

const POS_SET = new Set(POS_VALUES);
const POS_PATTERN = `(?:${POS_VALUES.join('|')})\\.?`;
const PHONETIC_PATTERN = /(?:\/[^/]{1,140}\/|\[[^\]]{1,140}\])/g;

interface Candidate {
  word: string;
  phonetic?: string;
  pos?: string;
  meaningCn: string;
  example?: string;
  source: string;
  strategy: string;
  confidence: number;
}

interface ParseOutput {
  items: VocabItem[];
  warnings: string[];
  parserReport: {
    strategyStats: Record<string, number>;
    estimatedEntryCount: number;
    qualityScore: number;
  };
}

// ==================== Auto (combines all strategies) ====================

export function parsePdfVocabText(rawText: string, source: string): ParseOutput {
  const inline = parseInlineNumberedPdfText(rawText, source);
  const momo = parseMomoTablePdfText(rawText, source);
  const simple = parseSimpleLinePdfText(rawText, source);

  const merged = dedupeCandidates([
    ...inline.items.map(itemToCandidate('inline-numbered')),
    ...momo.items.map(itemToCandidate('momo-table')),
    ...simple.items.map(itemToCandidate('simple-line')),
  ]).map(candidateToVocabItem);

  const estimatedEntryCount = Math.max(
    inline.parserReport.estimatedEntryCount,
    momo.parserReport.estimatedEntryCount,
    simple.parserReport.estimatedEntryCount,
  );

  const strategyStats = {
    ...inline.parserReport.strategyStats,
    ...momo.parserReport.strategyStats,
    ...simple.parserReport.strategyStats,
  };

  const qualityScore = estimatedEntryCount > 0
    ? Math.min(1, merged.length / estimatedEntryCount)
    : merged.length > 0 ? 0.8 : 0;

  return {
    items: merged,
    warnings: buildWarnings({ text: rawText, items: merged, estimatedEntryCount, strategyStats }),
    parserReport: { strategyStats, estimatedEntryCount, qualityScore },
  };
}

// ==================== Strategy 1: Inline numbered ====================
// "1. forehead /'fɔ:hed/ n.前额"

export function parseInlineNumberedPdfText(rawText: string, source: string): ParseOutput {
  const text = normalizeText(rawText);
  const candidates = parseInlineNumberedEntries(text, source);
  const items = dedupeCandidates(candidates).map(candidateToVocabItem);
  const estimatedEntryCount = countInlineEntries(text);

  return {
    items,
    warnings: buildWarnings({ text, items, estimatedEntryCount, strategyStats: { 'inline-numbered': candidates.length } }),
    parserReport: {
      strategyStats: { 'inline-numbered': candidates.length },
      estimatedEntryCount,
      qualityScore: estimatedEntryCount > 0 ? Math.min(1, items.length / estimatedEntryCount) : items.length > 0 ? 0.8 : 0,
    },
  };
}

function parseInlineNumberedEntries(text: string, source: string): Candidate[] {
  const flat = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const candidates: Candidate[] = [];

  const entryRe = /(?:^|\s)(\d{1,5})[.、]\s*([\s\S]*?)(?=\s+\d{1,5}[.、]\s*[A-Za-z]|$)/g;

  for (const match of flat.matchAll(entryRe)) {
    const body = cleanLine(match[2] || '');
    const parsed = parseInlineEntryBody(body);
    if (!parsed) continue;
    candidates.push({ ...parsed, source, strategy: 'inline-numbered', confidence: parsed.phonetic ? 0.96 : 0.82 });
  }

  return candidates;
}

function parseInlineEntryBody(body: string): Omit<Candidate, 'source' | 'strategy' | 'confidence'> | null {
  const cleaned = body.replace(/【List\d+】/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned || !hasChinese(cleaned)) return null;

  const phoneticMatches = Array.from(cleaned.matchAll(PHONETIC_PATTERN));
  const firstPhonetic = phoneticMatches[0];

  let word = '';
  let phonetic = '';
  let rest = '';

  if (firstPhonetic && typeof firstPhonetic.index === 'number') {
    word = cleaned.slice(0, firstPhonetic.index).trim();
    phonetic = firstPhonetic[0].trim();
    rest = cleaned.slice(firstPhonetic.index + firstPhonetic[0].length).trim();
  } else {
    const posMatch = cleaned.match(new RegExp(`\\b${POS_PATTERN}\\b`, 'i'));
    if (!posMatch || typeof posMatch.index === 'number' === false) return null;
    word = cleaned.slice(0, posMatch.index!).trim();
    rest = cleaned.slice(posMatch.index!).trim();
  }

  word = cleanWord(word);
  if (!isValidWordOrPhrase(word)) return null;

  const posMatches = Array.from(rest.matchAll(new RegExp(`\\b(${POS_PATTERN})\\b`, 'gi')))
    .map((m) => normalizePos(m[1]))
    .filter(Boolean);

  let meaningCn = rest
    .replace(PHONETIC_PATTERN, ' ')
    .replace(new RegExp(`\\b${POS_PATTERN}\\b\\s*\\.?`, 'gi'), ' ')
    .replace(/\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  meaningCn = cleanMeaning(meaningCn);
  if (!meaningCn) return null;

  return { word, phonetic, pos: Array.from(new Set(posMatches)).join('/') || undefined, meaningCn };
}

// ==================== Strategy 2: Momoe table ====================
// Block-based: number + word + phonetic + pos meanings + example

export function parseMomoTablePdfText(rawText: string, source: string): ParseOutput {
  const lines = normalizeText(rawText).split('\n').map(sanitizeLine).filter(Boolean).filter(l => !isHeaderLine(l));
  const candidates = parseEntryBlocks(lines, source);
  const items = dedupeCandidates(candidates).map(candidateToVocabItem);
  const estimatedEntryCount = items.length;

  return {
    items,
    warnings: [],
    parserReport: {
      strategyStats: { 'momo-table': candidates.length },
      estimatedEntryCount,
      qualityScore: items.length > 0 ? 0.85 : 0,
    },
  };
}

function parseEntryBlocks(lines: string[], source: string): Candidate[] {
  const candidates: Candidate[] = [];
  let i = 0;

  while (i < lines.length) {
    const start = readEntryStart(lines, i);
    if (!start) { i += 1; continue; }

    const blockLines: string[] = [];
    if (start.extra) blockLines.push(start.extra);

    let j = start.nextIndex;
    while (j < lines.length) {
      if (readEntryStart(lines, j)) break;
      blockLines.push(lines[j]);
      j += 1;
    }

    const candidate = parseBlockToCandidate({ word: start.word, blockLines, source });
    if (candidate) candidates.push(candidate);

    i = Math.max(j, i + 1);
  }

  return candidates;
}

interface EntryStart { word: string; extra: string; nextIndex: number }

function readEntryStart(lines: string[], index: number): EntryStart | null {
  const line = lines[index];
  if (!line || isHeaderLine(line)) return null;

  // "1 survey v. 调查"
  const m = line.match(/^(\d{1,3})\s+([A-Za-z][A-Za-z'’.\-]{1,70})(?:\s+(.*))?$/);
  if (m) {
    const word = cleanWord(m[2]);
    if (!/^\d{3}$/.test(m[1]) && isValidWordOrPhrase(word)) {
      return { word, extra: m[3] || '', nextIndex: index + 1 };
    }
  }

  // "1" + "survey"
  if (/^\d{1,3}$/.test(line)) {
    const next = lines[index + 1];
    if (next && isValidWordOrPhrase(next) && next.split(/\s+/).length === 1) {
      return { word: cleanWord(next), extra: '', nextIndex: index + 2 };
    }
  }

  return null;
}

function parseBlockToCandidate(input: { word: string; blockLines: string[]; source: string }): Candidate | null {
  const { word, blockLines, source } = input;
  const posSet = new Set<string>();
  const meaningParts: string[] = [];
  let phonetic = '';
  let hasMeaning = false;

  for (const rawLine of blockLines) {
    const pm = rawLine.match(PHONETIC_PATTERN);
    if (!phonetic && pm?.[0]) phonetic = pm[0];

    let line = rawLine.replace(PHONETIC_PATTERN, ' ').replace(/^\d{1,3}\s+/, '').replace(/\s+/g, ' ').trim();
    if (!line || isHeaderLine(line) || /^\d{1,3}$/.test(line)) continue;

    const meaning = parseMeaningLine(line);
    if (meaning) {
      for (const p of meaning.pos) posSet.add(p);
      meaningParts.push(meaning.meaningCn);
      hasMeaning = true;
      continue;
    }

    if (hasMeaning && hasChinese(line)) {
      meaningParts.push(cleanMeaning(line));
    }
  }

  const meaningCn = compactMeanings(meaningParts);
  if (!isValidWordOrPhrase(word) || !meaningCn || !hasChinese(meaningCn)) return null;

  return {
    word, phonetic, pos: Array.from(posSet).join('/') || undefined,
    meaningCn, source, strategy: 'momo-table', confidence: phonetic ? 0.94 : 0.8,
  };
}

function parseMeaningLine(line: string): { pos: string[]; meaningCn: string } | null {
  if (!hasChinese(line)) return null;

  const posMatches = Array.from(
    line.matchAll(new RegExp(`(?:(?<=^)|(?<=\\s))(${POS_PATTERN})(?=\\s*[一-鿿])`, 'gi'))
  ).map((m) => normalizePos(m[1]));

  if (posMatches.length === 0 && !/^[一-鿿；;，,、（）()…\s]+$/.test(line)) return null;

  let meaningCn = line
    .replace(PHONETIC_PATTERN, ' ')
    .replace(new RegExp(`(?:(?<=^)|(?<=\\s))${POS_PATTERN}\\s*`, 'gi'), ' ')
    .replace(/^[:：\-—]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  meaningCn = cleanMeaning(meaningCn);
  if (!meaningCn || !hasChinese(meaningCn)) return null;

  return { pos: posMatches, meaningCn };
}

// ==================== Strategy 3: Simple line ====================
// "survey v. 调查；勘测"

function parseSimpleLinePdfText(rawText: string, source: string): ParseOutput {
  const lines = normalizeText(rawText).split('\n').map(sanitizeLine).filter(Boolean);
  const candidates: Candidate[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(PHONETIC_PATTERN, ' ').replace(/\s+/g, ' ').trim();
    if (!hasChinese(line)) continue;

    const match = line.match(new RegExp(`^([A-Za-z][A-Za-z'’.\\-]{1,70})\\s+(${POS_PATTERN})?\\s*(.+)$`, 'i'));
    if (!match) continue;

    const w = cleanWord(match[1]);
    if (!isValidWordOrPhrase(w)) continue;

    const pos = normalizePos(match[2] || '');
    const meaningCn = cleanMeaning(match[3] || '');
    if (!meaningCn || !hasChinese(meaningCn)) continue;

    candidates.push({ word: w, pos: pos || undefined, meaningCn, source, strategy: 'simple-line', confidence: 0.7 });
  }

  const items = dedupeCandidates(candidates).map(candidateToVocabItem);

  return {
    items,
    warnings: [],
    parserReport: {
      strategyStats: { 'simple-line': candidates.length },
      estimatedEntryCount: candidates.length,
      qualityScore: items.length > 0 ? 0.7 : 0,
    },
  };
}

// ==================== Helpers ====================

function itemToCandidate(strategy: string) {
  return (item: VocabItem): Candidate => ({
    word: item.word, phonetic: item.phonetic, pos: item.pos,
    meaningCn: item.meaningCn, example: item.example,
    source: item.source, strategy, confidence: 0.8,
  });
}

function candidateToVocabItem(c: Candidate): VocabItem {
  return {
    id: generateId(), word: c.word, phonetic: c.phonetic, pos: c.pos,
    meaningCn: c.meaningCn, example: c.example, examTags: [], difficulty: 2, source: c.source,
  };
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.word.toLowerCase();
    const existing = best.get(key);
    if (!existing || c.confidence > existing.confidence) best.set(key, c);
  }
  return Array.from(best.values());
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, '\n').replace(/ /g, ' ').replace(/[ ￾�]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizeLine(line: string): string {
  return line.replace(/[ ￾�]/g, '').replace(/^[•●◆◇▪▫]\s*/, '').replace(/\s+/g, ' ').trim();
}

function isHeaderLine(line: string): boolean {
  if (!line) return true;
  if (/^墨墨背单词/.test(line)) return true;
  if (/^单词\s+释义\s+例句$/.test(line)) return true;
  if (/^Page\s+\d+$/i.test(line)) return true;
  if (/^第\s*\d+\s*页$/.test(line)) return true;
  if (/^\d{3}\s+.*——/.test(line)) return true;
  if (['单词', '释义', '例句', '核心词'].includes(line)) return true;
  return false;
}

function cleanLine(line: string): string {
  return line.replace(/[ ￾�]/g, '').replace(/\s+/g, ' ').trim();
}

function cleanWord(value: string): string {
  return value.replace(/['']/g, "'").replace(/^[^A-Za-z]+/, '').replace(/[，,;；:：。]+$/g, '').replace(/\s+/g, ' ').trim();
}

function cleanMeaning(value: string): string {
  let r = value.replace(/^[:：\-—.。]+/, '').replace(/\s+/g, ' ').trim();
  r = r.replace(/\s+[A-Za-z][A-Za-z ,.'";:!?()\-]{14,}.*$/g, '');
  if (r.length > 200) r = r.slice(0, 200).trim();
  return r.replace(/[。；;，,]+$/g, '').trim();
}

function normalizePos(value: string): string {
  return value.toLowerCase().replace(/\.$/, '').trim();
}

function isValidWordOrPhrase(value: string): boolean {
  const w = cleanWord(value);
  if (!w || w.length < 2 || w.length > 80 || hasChinese(w)) return false;
  const lower = w.toLowerCase().replace(/\.$/, '');
  const invalid = new Set(['word', 'words', 'vocabulary', 'meaning', 'translation', 'example', 'page', 'list', 'unit', 'section', 'core', ...POS_VALUES]);
  if (invalid.has(lower)) return false;
  return /^[A-Za-z][A-Za-z'’.-]*(?:\s(?:of|to|with|for|on|in|up|off|out|over|under|by|from|and))?$/.test(w);
}

function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

function compactMeanings(parts: string[]): string {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const c = cleanMeaning(p);
    if (!c || !hasChinese(c) || seen.has(c)) continue;
    seen.add(c);
    result.push(c);
  }
  return result.join('；');
}

function countInlineEntries(text: string): number {
  return Array.from(text.matchAll(/\b\d{1,5}[.、]\s*[A-Za-z][A-Za-z'’.-]*/g)).length;
}

function buildWarnings(input: { text: string; items: VocabItem[]; estimatedEntryCount: number; strategyStats: Record<string, number> }): string[] {
  const { text, items, estimatedEntryCount, strategyStats } = input;
  const warnings: string[] = [];

  if (text.length < 100) {
    warnings.push('这个 PDF 没有提取到足够文字，可能是扫描版 PDF。当前版本需要可复制文字的 PDF。');
  }
  if (estimatedEntryCount >= 100 && items.length < estimatedEntryCount * 0.5) {
    warnings.push(`PDF 里疑似有 ${estimatedEntryCount} 个词条，但当前只识别出 ${items.length} 个，解析质量偏低。`);
  }
  if (text.length > 3000 && items.length < 50) {
    warnings.push(`PDF 已提取到大量文字，但只识别出 ${items.length} 个单词。该 PDF 可能是复杂排版或文字顺序异常。`);
  }

  warnings.push(`解析策略统计：${Object.entries(strategyStats).map(([k, v]) => `${k}: ${v}`).join('，')}`);

  return warnings;
}
