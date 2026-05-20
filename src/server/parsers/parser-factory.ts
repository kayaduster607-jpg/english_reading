import type { VocabItem } from '@/shared/types';
import { parseTxt } from './txt-parser';
import { parseCsv } from './csv-parser';

export type PdfParseMode = 'auto' | 'inline-numbered' | 'momo-table' | 'ai-assisted';

export interface VocabParserInput {
  fileName: string;
  buffer: Buffer;
  contentType?: string;
  mode?: PdfParseMode | string;
}

export interface VocabParseResult {
  items: VocabItem[];
  warnings: string[];
  rawTextPreview?: string;
  parserReport?: {
    strategyStats?: Record<string, number>;
    estimatedEntryCount?: number;
    qualityScore?: number;
  };
}

export interface VocabParser {
  parse(input: VocabParserInput): Promise<VocabParseResult>;
}

function wrapLegacyParser(fn: (content: string, fileName: string) => VocabItem[]): VocabParser {
  return {
    parse: async (input) => ({
      items: fn(input.buffer.toString('utf-8'), input.fileName),
      warnings: [],
    }),
  };
}

const parsers: Record<string, VocabParser> = {
  '.txt': wrapLegacyParser(parseTxt),
  '.csv': wrapLegacyParser(parseCsv),
  '.xlsx': { parse: async (input) => (await import('./xlsx-parser')).parseExcel(input) },
  '.xls': { parse: async (input) => (await import('./xlsx-parser')).parseExcel(input) },
  '.pdf': { parse: async (input) => (await import('./pdf-parser')).parsePdf(input) },
};

export function getParser(fileName: string): VocabParser {
  const ext = getFileExtension(fileName);
  const parser = parsers[ext];
  if (!parser) {
    throw new Error(`Unsupported file format: ${ext}. Supported: .txt, .csv, .xlsx, .xls, .pdf`);
  }
  return parser;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}
