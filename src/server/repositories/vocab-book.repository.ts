import type { VocabBook, VocabItem } from '@/shared/types';
import { readJson } from '../storage/json';
import { readJsonl } from '../storage/jsonl';
import { writeJsonAtomic } from '../storage/json';
import { writeJsonl } from '../storage/jsonl';
import { dataPath } from '../storage/path';
import { listDirs, fileExists } from '../storage/file-system';
import { generateBookId } from '@/shared/id';

export class VocabBookRepository {
  async listBooks(): Promise<VocabBook[]> {
    const books: VocabBook[] = [];

    for (const sourceType of ['builtin', 'uploaded']) {
      const baseDir = dataPath('vocab-books', sourceType);
      const dirs = await listDirs(baseDir);

      for (const bookId of dirs) {
        const metaPath = dataPath('vocab-books', sourceType, bookId, 'meta.json');
        if (await fileExists(metaPath)) {
          const meta = await readJson<VocabBook>(metaPath);
          books.push(meta);
        }
      }
    }

    return books;
  }

  async getBookMeta(bookId: string): Promise<VocabBook | null> {
    for (const sourceType of ['builtin', 'uploaded']) {
      const metaPath = dataPath('vocab-books', sourceType, bookId, 'meta.json');
      if (await fileExists(metaPath)) {
        return readJson<VocabBook>(metaPath);
      }
    }
    return null;
  }

  async loadWords(bookIds: string[]): Promise<VocabItem[]> {
    const allWords: VocabItem[] = [];

    for (const bookId of bookIds) {
      for (const sourceType of ['builtin', 'uploaded']) {
        const wordsPath = dataPath('vocab-books', sourceType, bookId, 'words.jsonl');
        if (await fileExists(wordsPath)) {
          const words = await readJsonl<VocabItem>(wordsPath);
          allWords.push(...words);
          break;
        }
      }
    }

    return allWords;
  }

  async createUploadedBook(input: {
    name: string;
    examTarget?: string;
    items: VocabItem[];
  }): Promise<VocabBook> {
    const bookId = generateBookId();
    const now = new Date().toISOString();

    const meta: VocabBook = {
      id: bookId,
      name: input.name,
      sourceType: 'uploaded',
      examTarget: input.examTarget as VocabBook['examTarget'],
      language: 'en-cn',
      wordCount: input.items.length,
      createdAt: now,
      updatedAt: now,
      tags: input.examTarget ? [input.examTarget, 'uploaded'] : ['uploaded'],
    };

    const baseDir = dataPath('vocab-books', 'uploaded', bookId);
    await writeJsonAtomic(`${baseDir}/meta.json`, meta);

    const itemsWithSource = input.items.map((item) => ({
      ...item,
      source: bookId,
    }));
    await writeJsonl(`${baseDir}/words.jsonl`, itemsWithSource);

    return meta;
  }
}
