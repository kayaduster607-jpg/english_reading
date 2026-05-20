import type { VocabItem, WordProgress, ExamId } from '@/shared/types';
import { VocabBookRepository } from '../repositories/vocab-book.repository';
import { ProgressRepository } from '../repositories/progress.repository';

const ADVANCED_EXAMS: ExamId[] = ['cet6', 'postgraduate', 'ielts', 'toefl'];

const COMMON_LOW_LEVEL_WORDS = new Set([
  'good', 'same', 'could', 'huge', 'salt', 'sugar', 'bird', 'picture',
  'please', 'sir', 'save', 'boot', 'big', 'small', 'old', 'new',
  'man', 'woman', 'boy', 'girl', 'dog', 'cat', 'run', 'walk',
]);

export class VocabSelectionService {
  private vocabBookRepo = new VocabBookRepository();
  private progressRepo = new ProgressRepository();

  async selectWordsForToday(input: {
    userId: string;
    examTarget: ExamId;
    vocabBookIds: string[];
    date: string;
    limit: number;
  }): Promise<VocabItem[]> {
    const allWords = await this.vocabBookRepo.loadWords(input.vocabBookIds);
    const progress = await this.progressRepo.getProgress(input.userId);

    return this.rankWords(allWords, progress.words, input.limit, input.date, input.examTarget);
  }

  private rankWords(
    allWords: VocabItem[],
    progressMap: Record<string, WordProgress>,
    limit: number,
    today: string,
    examTarget: ExamId
  ): VocabItem[] {
    const scored = allWords.map((word) => {
      const progress = progressMap[word.word];
      let score = 0;

      if (!progress) {
        score = 100;
      } else if (progress.status === 'weak') {
        score = 90;
      } else if (progress.nextReviewAt && progress.nextReviewAt <= today) {
        score = 80 - progress.familiarity * 5;
      } else if (progress.status === 'learning') {
        score = 60;
      } else if (progress.status === 'familiar') {
        score = 30;
      } else if (progress.status === 'mastered') {
        score = 10;
      }

      // Deprioritize basic words for advanced exams
      if (ADVANCED_EXAMS.includes(examTarget) && COMMON_LOW_LEVEL_WORDS.has(word.word.toLowerCase())) {
        score -= 25;
      }

      score += Math.random() * 5;
      return { word, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.word);
  }
}
