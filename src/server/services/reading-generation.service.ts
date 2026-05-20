import type { GeneratedReading, ExamProfile, VocabItem } from '@/shared/types';
import { getAIProvider } from '../ai/provider';
import { ExamRepository } from '../repositories/exam.repository';
import { UserRepository } from '../repositories/user.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { VocabSelectionService } from './vocab-selection.service';
import { ReadingValidationService } from './reading-validation.service';
import { generateReadingId } from '@/shared/id';
import { countParagraphWords } from '@/shared/word-count';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';

export class ReadingGenerationService {
  private examRepo = new ExamRepository();
  private userRepo = new UserRepository();
  private readingRepo = new ReadingRepository();
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
  }): Promise<GeneratedReading> {
    if (!input.force) {
      const existing = await this.readingRepo.getTodayReading(input.userId, input.date);
      if (existing) return existing;
    }

    const plan = await this.userRepo.getPlan(input.userId);

    const sourceVocabBookIds =
      input.vocabBookIds && input.vocabBookIds.length > 0
        ? input.vocabBookIds
        : plan.activeVocabBookIds;

    if (sourceVocabBookIds.length === 0) {
      throw new Error('没有启用的词书，请先到词书页面选择词书。');
    }

    const examProfile = await this.examRepo.getById(plan.examTarget);

    const targetWordLimit = normalizeReadingTargetWordCount(
      input.targetWordCount ?? plan.readingTargetWordCount,
      plan.examTarget
    );

    const targetWords = await this.vocabSelection.selectWordsForToday({
      userId: input.userId,
      examTarget: plan.examTarget,
      vocabBookIds: sourceVocabBookIds,
      date: input.date,
      limit: targetWordLimit,
    });

    if (targetWords.length === 0) {
      throw new Error('词书中没有可用的单词，请检查词书内容。');
    }

    const aiOutput = await this.generateWithRetry(examProfile, targetWords, input.topic);

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
    return reading;
  }

  private async generateWithRetry(
    examProfile: ExamProfile,
    targetWords: VocabItem[],
    topic?: string
  ) {
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
