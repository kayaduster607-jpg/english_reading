import path from 'path';

const ROOT = process.cwd();

export function dataPath(...segments: string[]): string {
  return path.join(ROOT, 'data', ...segments);
}

export function examPath(examId: string): string {
  return dataPath('exams', `${examId}.json`);
}

export function vocabBookMetaPath(bookId: string, sourceType: string = 'builtin'): string {
  return dataPath('vocab-books', sourceType, bookId, 'meta.json');
}

export function vocabBookWordsPath(bookId: string, sourceType: string = 'builtin'): string {
  return dataPath('vocab-books', sourceType, bookId, 'words.jsonl');
}

export function userPath(userId: string, ...segments: string[]): string {
  return dataPath('users', userId, ...segments);
}

export function readingPath(userId: string, dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return userPath(userId, 'readings', year, month, `${dateStr}.json`);
}
