import type { ExamId, VocabItem, WordProgress } from '@/shared/types';
import { VocabBookRepository } from '../repositories/vocab-book.repository';
import { ProgressRepository } from '../repositories/progress.repository';

interface SelectWordsInput {
  userId: string;
  examTarget: ExamId;
  vocabBookIds: string[];
  date: string;
  limit: number;
  dailyNewWords: number;
  dailyReviewWords: number;
}

interface ScoredWord {
  word: VocabItem;
  score: number;
}

const ADVANCED_EXAMS: ExamId[] = ['cet6', 'postgraduate', 'ielts', 'toefl'];

const COMMON_LOW_LEVEL_WORDS = new Set([
  'good', 'same', 'could', 'huge', 'salt', 'sugar', 'bird', 'picture',
  'please', 'sir', 'save', 'boot', 'big', 'small', 'old', 'new',
  'man', 'woman', 'boy', 'girl', 'dog', 'cat', 'run', 'walk',
]);

export class VocabSelectionService {
  private vocabBookRepo = new VocabBookRepository();
  private progressRepo = new ProgressRepository();

  async selectWordsForReading(input: SelectWordsInput): Promise<VocabItem[]> {
    const allWords = await this.vocabBookRepo.loadWords(input.vocabBookIds);
    const dedupedWords = dedupeByWord(allWords);
    const progress = await this.progressRepo.getProgress(input.userId);
    const progressMap = progress.words || {};

    const reviewCandidates: ScoredWord[] = [];
    const newCandidates: ScoredWord[] = [];
    const fillerCandidates: ScoredWord[] = [];

    for (const word of dedupedWords) {
      const key = normalizeWordKey(word.word);
      const wordProgress = progressMap[key];

      const scored = {
        word,
        score: scoreWord(word, wordProgress, input.date, input.examTarget),
      };

      if (!wordProgress) {
        newCandidates.push(scored);
      } else if (isReviewCandidate(wordProgress, input.date)) {
        reviewCandidates.push(scored);
      } else {
        fillerCandidates.push(scored);
      }
    }

    reviewCandidates.sort(sortByScore);
    newCandidates.sort(sortByScore);
    fillerCandidates.sort(sortByScore);

    const result: VocabItem[] = [];

    // 40% 给复习词，60% 给新词
    const reviewQuota = input.dailyReviewWords > 0
      ? Math.min(Math.round(input.limit * 0.4), input.limit)
      : 0;
    const newQuota = input.dailyNewWords > 0
      ? input.limit - reviewQuota
      : 0;

    result.push(...reviewCandidates.slice(0, reviewQuota).map((s) => s.word));
    result.push(...newCandidates.slice(0, newQuota).map((s) => s.word));

    // 不够就用 filler 补
    if (result.length < input.limit) {
      const selectedKeys = new Set(result.map((w) => normalizeWordKey(w.word)));
      const remaining = [...reviewCandidates, ...newCandidates, ...fillerCandidates]
        .filter((s) => !selectedKeys.has(normalizeWordKey(s.word.word)));
      result.push(...remaining.slice(0, input.limit - result.length).map((s) => s.word));
    }

    return result.slice(0, input.limit);
  }
}

function scoreWord(
  word: VocabItem,
  progress: WordProgress | undefined,
  today: string,
  examTarget: ExamId
): number {
  let score = 0;

  if (!progress) {
    score += 700; // 新词高优先
  } else {
    if (progress.status === 'weak') score += 1000;
    else if (progress.status === 'learning') score += 600;
    else if (progress.status === 'familiar') score += 300;
    else if (progress.status === 'mastered') score -= 1000;

    if (isDue(progress, today)) score += 500;

    // 最近 3 天出现过，降权
    if (isRecentlySeen(progress.lastSeenAt, today, 3)) score -= 800;

    score -= (progress.seenCount || 0) * 15;
  }

  // 高级考试降权基础词
  if (ADVANCED_EXAMS.includes(examTarget) && COMMON_LOW_LEVEL_WORDS.has(normalizeWordKey(word.word))) {
    score -= 200;
  }

  // 稳定扰动：同日期同词得到相同随机偏移，避免每天顺序不同但也不完全固定
  score += stableHash(`${today}:${word.word}`) % 50;

  return score;
}

function isReviewCandidate(progress: WordProgress, today: string): boolean {
  if (progress.status === 'weak') return true;
  if (progress.status === 'learning' && isDue(progress, today)) return true;
  if (progress.status === 'familiar' && isDue(progress, today)) return true;
  return false;
}

function isDue(progress: WordProgress, today: string): boolean {
  if (!progress.nextReviewAt) return true;
  return progress.nextReviewAt.slice(0, 10) <= today;
}

function isRecentlySeen(lastSeenAt: string | undefined | null, today: string, days: number): boolean {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt.slice(0, 10));
  const current = new Date(today);
  const diffDays = (current.getTime() - last.getTime()) / 1000 / 60 / 60 / 24;
  return diffDays >= 0 && diffDays < days;
}

function sortByScore(a: ScoredWord, b: ScoredWord): number {
  return b.score - a.score;
}

function dedupeByWord(words: VocabItem[]): VocabItem[] {
  const seen = new Set<string>();
  const result: VocabItem[] = [];
  for (const word of words) {
    const key = normalizeWordKey(word.word);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
