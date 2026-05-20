import type { SubmitReviewInput, WordStatus, ReviewLogEntry } from '@/shared/types';
import { ProgressRepository } from '../repositories/progress.repository';
import { appendJsonl } from '../storage/jsonl';
import { userPath } from '../storage/path';

export class ReviewService {
  private progressRepo = new ProgressRepository();

  async submitReview(userId: string, input: SubmitReviewInput): Promise<void> {
    const now = new Date().toISOString();
    const updates: Array<{
      word: string;
      update: Partial<import('@/shared/types').WordProgress>;
    }> = [];

    const logEntries: ReviewLogEntry[] = [];

    for (const result of input.results) {
      const progress = await this.progressRepo.getProgress(userId);
      const existing = progress.words[result.word];

      const currentFamiliarity = existing?.familiarity ?? 0;
      const currentCorrect = existing?.correctCount ?? 0;
      const currentWrong = existing?.wrongCount ?? 0;
      const currentPractice = existing?.practiceCount ?? 0;

      const isCorrect = result.questionCorrect;
      const newFamiliarity = Math.max(0, Math.min(5, currentFamiliarity + (isCorrect ? 1 : -1)));

      const newStatus = this.calculateStatus(
        newFamiliarity,
        currentCorrect + (isCorrect ? 1 : 0),
        result.status
      );

      const nextReviewAt = this.calculateNextReview(newStatus, newFamiliarity);

      updates.push({
        word: result.word,
        update: {
          status: newStatus,
          familiarity: newFamiliarity,
          practiceCount: currentPractice + 1,
          correctCount: currentCorrect + (isCorrect ? 1 : 0),
          wrongCount: currentWrong + (isCorrect ? 0 : 1),
          nextReviewAt,
        },
      });

      logEntries.push({
        date: input.readingId.split('_').slice(1, 4).join('-'),
        readingId: input.readingId,
        word: result.word,
        status: result.status,
        questionCorrect: result.questionCorrect,
        timestamp: now,
      });
    }

    await this.progressRepo.batchUpdateProgress(userId, updates);

    for (const entry of logEntries) {
      await appendJsonl(userPath(userId, 'review-log.jsonl'), entry);
    }
  }

  private calculateStatus(
    familiarity: number,
    correctCount: number,
    reviewStatus: string
  ): WordStatus {
    if (familiarity >= 4 && correctCount >= 3) return 'mastered';
    if (familiarity >= 3) return 'familiar';
    if (familiarity >= 2) return 'learning';
    if (reviewStatus === 'unknown') return 'weak';
    return 'learning';
  }

  private calculateNextReview(status: WordStatus, familiarity: number): string {
    const now = new Date();
    let days: number;

    switch (status) {
      case 'mastered': days = 14; break;
      case 'familiar': days = 7; break;
      case 'learning': days = 3; break;
      case 'weak': days = 1; break;
      default: days = 2;
    }

    now.setDate(now.getDate() + days);
    return now.toISOString();
  }
}
