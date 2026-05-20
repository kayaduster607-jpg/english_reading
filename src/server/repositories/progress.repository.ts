import type { ProgressData, WordProgress, VocabItem } from '@/shared/types';
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

  async saveProgress(userId: string, progress: ProgressData): Promise<void> {
    const filePath = userPath(userId, 'progress.json');
    await writeJsonAtomic(filePath, progress);
  }

  async markWordsExposed(input: {
    userId: string;
    readingId: string;
    words: VocabItem[];
    date: string;
  }): Promise<void> {
    const progress = await this.getProgress(input.userId);
    const now = new Date().toISOString();

    for (const item of input.words) {
      const key = normalizeWordKey(item.word);
      const current = progress.words[key];

      // 同一篇阅读不要重复计数
      if (current?.lastReadingId === input.readingId) continue;

      const next: WordProgress = current
        ? {
            ...current,
            seenCount: current.seenCount + 1,
            lastSeenAt: now,
            lastReadingId: input.readingId,
          }
        : {
            word: item.word,
            status: 'learning',
            familiarity: 1,
            seenCount: 1,
            practiceCount: 0,
            correctCount: 0,
            wrongCount: 0,
            firstSeenAt: now,
            lastSeenAt: now,
            nextReviewAt: addDays(now, 1),
            lastReadingId: input.readingId,
          };

      progress.words[key] = next;
    }

    await this.saveProgress(input.userId, progress);
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
      practiceCount: 0,
      correctCount: 0,
      wrongCount: 0,
      lastSeenAt: null,
      nextReviewAt: null,
    };

    progress.words[word] = { ...existing, ...update };
    await this.saveProgress(userId, progress);
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
        practiceCount: 0,
        correctCount: 0,
        wrongCount: 0,
        lastSeenAt: null,
        nextReviewAt: null,
      };
      progress.words[word] = { ...existing, ...update };
    }

    await this.saveProgress(userId, progress);
  }
}

function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
