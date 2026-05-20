import type { ProgressData, WordProgress } from '@/shared/types';
import { readJson, writeJsonAtomic } from '../storage/json';
import { userPath } from '../storage/path';
import { fileExists } from '../storage/file-system';

export class ProgressRepository {
  async getProgress(userId: string): Promise<ProgressData> {
    const filePath = userPath(userId, 'progress.json');
    if (await fileExists(filePath)) {
      return readJson<ProgressData>(filePath);
    }
    return { userId, words: {} };
  }

  async updateWordProgress(
    userId: string,
    word: string,
    update: Partial<WordProgress>
  ): Promise<void> {
    const progress = await this.getProgress(userId);

    const existing = progress.words[word] || {
      word,
      status: 'new' as const,
      familiarity: 0,
      seenCount: 0,
      correctCount: 0,
      wrongCount: 0,
      lastSeenAt: null,
      nextReviewAt: null,
    };

    progress.words[word] = { ...existing, ...update };

    const filePath = userPath(userId, 'progress.json');
    await writeJsonAtomic(filePath, progress);
  }

  async batchUpdateProgress(
    userId: string,
    updates: Array<{ word: string; update: Partial<WordProgress> }>
  ): Promise<void> {
    const progress = await this.getProgress(userId);

    for (const { word, update } of updates) {
      const existing = progress.words[word] || {
        word,
        status: 'new' as const,
        familiarity: 0,
        seenCount: 0,
        correctCount: 0,
        wrongCount: 0,
        lastSeenAt: null,
        nextReviewAt: null,
      };
      progress.words[word] = { ...existing, ...update };
    }

    const filePath = userPath(userId, 'progress.json');
    await writeJsonAtomic(filePath, progress);
  }
}
