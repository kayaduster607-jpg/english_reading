import type { GeneratedReading, ExamProfile, VocabItem, AIReadingOutput } from '@/shared/types';
import { getAIProvider } from '../ai/provider';
import { ExamRepository } from '../repositories/exam.repository';
import { UserRepository } from '../repositories/user.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { ProgressRepository } from '../repositories/progress.repository';
import { VocabSelectionService } from './vocab-selection.service';
import { ReadingValidationService } from './reading-validation.service';
import { generateReadingId } from '@/shared/id';
import { countParagraphWords } from '@/shared/word-count';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';

export interface GenerationProgressEvent {
  type?: 'progress' | 'done' | 'error';
  percent: number;
  message: string;
  reading?: GeneratedReading;
}

export class ReadingGenerationService {
  private examRepo = new ExamRepository();
  private userRepo = new UserRepository();
  private readingRepo = new ReadingRepository();
  private progressRepo = new ProgressRepository();
  private vocabSelection = new VocabSelectionService();
  private validation = new ReadingValidationService();
  private aiProvider = getAIProvider();

  async generateTodayReading(input: {
    userId: string;
    date: string;
    topic?: string;
    vocabBookIds?: string[];
    targetWordCount?: number;
    force?: boolean;
    onProgress?: (event: GenerationProgressEvent) => void;
  }): Promise<GeneratedReading> {
    if (!input.force) {
      const existing = await this.readingRepo.getTodayReading(input.userId, input.date);
      if (existing) return existing;
    }

    input.onProgress?.({ percent: 10, message: '正在读取学习计划...' });
    const plan = await this.userRepo.getPlan(input.userId);

    const sourceVocabBookIds =
      input.vocabBookIds && input.vocabBookIds.length > 0
        ? input.vocabBookIds
        : plan.activeVocabBookIds;

    if (sourceVocabBookIds.length === 0) {
      throw new Error('没有启用的词书，请先到词书页面选择词书。');
    }

    input.onProgress?.({ percent: 18, message: '正在读取考试难度配置...' });
    const examProfile = await this.examRepo.getById(plan.examTarget);

    input.onProgress?.({ percent: 25, message: '正在选择本篇目标词...' });
    const targetWordLimit = normalizeReadingTargetWordCount(
      input.targetWordCount ?? plan.readingTargetWordCount,
      plan.examTarget
    );

    const targetWords = await this.vocabSelection.selectWordsForReading({
      userId: input.userId,
      examTarget: plan.examTarget,
      vocabBookIds: sourceVocabBookIds,
      date: input.date,
      limit: targetWordLimit,
      dailyNewWords: plan.dailyNewWords,
      dailyReviewWords: plan.dailyReviewWords,
    });

    if (targetWords.length === 0) {
      throw new Error('词书中没有可用的单词，请检查词书内容。');
    }

    input.onProgress?.({ percent: 35, message: `已选择 ${targetWords.length} 个目标词，正在请求 AI 生成...` });

    const aiOutput = await this.generateWithProgress(examProfile, targetWords, input.topic, input.onProgress);

    input.onProgress?.({ percent: 88, message: '正在校验文章难度、字数和目标词...' });
    this.validation.validate(aiOutput, examProfile, targetWords);

    input.onProgress?.({ percent: 94, message: '正在保存阅读记录...' });

    const reading: GeneratedReading = {
      id: generateReadingId(input.date, plan.examTarget),
      date: input.date,
      userId: input.userId,
      examTarget: plan.examTarget,
      cefr: examProfile.cefr,
      topic: aiOutput.topic,
      title: aiOutput.title,
      wordCount: countParagraphWords(aiOutput.paragraphs),
      sourceVocabBookIds,
      targetWords: targetWords.map((w) => ({
        word: w.word,
        meaningCn: w.meaningCn,
        pos: w.pos,
      })),
      guideCn: aiOutput.guideCn,
      paragraphs: aiOutput.paragraphs,
      translationCn: aiOutput.translationCn,
      vocabularyInContext: aiOutput.vocabularyInContext,
      questions: aiOutput.questions,
      cloze: aiOutput.cloze,
      createdAt: new Date().toISOString(),
    };

    await this.readingRepo.saveReading(input.userId, reading);

    input.onProgress?.({ percent: 97, message: '正在更新单词学习进度...' });

    await this.progressRepo.markWordsExposed({
      userId: input.userId,
      readingId: reading.id,
      words: targetWords,
      date: input.date,
    });

    await this.readingRepo.pruneOldReadings(input.userId, 15);

    input.onProgress?.({ percent: 100, message: '生成完成', reading });

    return reading;
  }

  private async generateWithProgress(
    examProfile: ExamProfile,
    targetWords: VocabItem[],
    topic: string | undefined,
    onProgress?: (event: GenerationProgressEvent) => void
  ): Promise<AIReadingOutput> {
    let percent = 42;

    const timer = setInterval(() => {
      percent = Math.min(percent + 3, 82);
      onProgress?.({ percent, message: 'AI 正在生成文章、题目和全文翻译...' });
    }, 1800);

    try {
      const output = await this.generateWithRetry(examProfile, targetWords, topic);
      onProgress?.({ percent: 85, message: 'AI 已返回内容，正在解析...' });
      return output;
    } finally {
      clearInterval(timer);
    }
  }

  private async generateWithRetry(
    examProfile: ExamProfile,
    targetWords: VocabItem[],
    topic?: string
  ): Promise<AIReadingOutput> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const output = await this.aiProvider.generateReading({
          examProfile,
          targetWords,
          topic,
        });
        this.validation.validate(output, examProfile, targetWords);
        return output;
      } catch (error) {
        lastError = error;
        console.warn(
          `Reading generation attempt ${attempt} failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Reading generation failed after retries.');
  }
}
