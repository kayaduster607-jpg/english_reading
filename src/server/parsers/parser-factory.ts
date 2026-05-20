import type { VocabItem } from '@/shared/types';
import { parseTxt } from './txt-parser';
import { parseCsv } from './csv-parser';

export interface VocabParser {
  parse(content: string, fileName: string): VocabItem[];
}

const parsers: Record<string, VocabParser> = {
  '.txt': { parse: parseTxt },
  '.csv': { parse: parseCsv },
};

export function getParser(fileName: string): VocabParser {
  const ext = getFileExtension(fileName);
  const parser = parsers[ext];
  if (!parser) {
    throw new Error(`Unsupported file format: ${ext}. Supported: .txt, .csv`);
  }
  return parser;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}
