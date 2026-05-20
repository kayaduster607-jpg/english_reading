import type { GeneratedReading } from '@/shared/types';
import { getAIProvider } from '../ai/provider';
import { ExamRepository } from '../repositories/exam.repository';
import { UserRepository } from '../repositories/user.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { VocabSelectionService } from './vocab-selection.service';
import { ReadingValidationService } from './reading-validation.service';
import { generateReadingId } from '@/shared/id';
import { countParagraphWords } from '@/shared/word-count';

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
    force?: boolean;
  }): Promise<GeneratedReading> {
    if (!input.force) {
      const existing = await this.readingRepo.getTodayReading(input.userId, input.date);
      if (existing) return existing;
    }

    const plan = await this.userRepo.getPlan(input.userId);

    if (plan.activeVocabBookIds.length === 0) {
      throw new Error('没有启用的词书，请先到设置页面启用词书。');
    }

    const examProfile = await this.examRepo.getById(plan.examTarget);

    const targetWords = await this.vocabSelection.selectWordsForToday({
      userId: input.userId,
      examTarget: plan.examTarget,
      vocabBookIds: plan.activeVocabBookIds,
      date: input.date,
      limit: plan.dailyNewWords + plan.dailyReviewWords,
    });

    if (targetWords.length === 0) {
      throw new Error('词书中没有可用的单词，请检查词书内容。');
    }

    const aiOutput = await this.aiProvider.generateReading({
      examProfile,
      targetWords,
      topic: input.topic,
    });

    this.validation.validate(aiOutput, examProfile, targetWords);

    const reading: GeneratedReading = {
      id: generateReadingId(input.date, plan.examTarget),
      date: input.date,
      userId: input.userId,
      examTarget: plan.examTarget,
      cefr: examProfile.cefr,
      topic: aiOutput.topic,
      title: aiOutput.title,
      wordCount: countParagraphWords(aiOutput.paragraphs),
      sourceVocabBookIds: plan.activeVocabBookIds,
      targetWords: targetWords.map((w) => ({
        word: w.word,
        meaningCn: w.meaningCn,
        pos: w.pos,
      })),
      guideCn: aiOutput.guideCn,
      paragraphs: aiOutput.paragraphs,
      vocabularyInContext: aiOutput.vocabularyInContext,
      questions: aiOutput.questions,
      cloze: aiOutput.cloze,
      createdAt: new Date().toISOString(),
    };

    await this.readingRepo.saveReading(input.userId, reading);
    return reading;
  }
}
