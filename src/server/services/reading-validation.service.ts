import type { AIReadingOutput, ExamProfile, VocabItem } from '@/shared/types';
import { countParagraphWords } from '@/shared/word-count';

export class ReadingValidationService {
  validate(
    output: AIReadingOutput,
    examProfile: ExamProfile,
    targetWords: VocabItem[]
  ): void {
    this.validateWordCount(output, examProfile);
    this.validateTargetWordsAppear(output, targetWords);
    this.validateQuestions(output);
  }

  private validateWordCount(output: AIReadingOutput, exam: ExamProfile): void {
    const wordCount = countParagraphWords(output.paragraphs);
    const { min, max } = exam.articleWordCount;
    // Allow 10% tolerance
    const tolerance = 0.1;
    if (wordCount < min * (1 - tolerance) || wordCount > max * (1 + tolerance)) {
      console.warn(
        `Word count ${wordCount} outside range ${min}-${max} (with tolerance). Proceeding anyway.`
      );
    }
  }

  private validateTargetWordsAppear(output: AIReadingOutput, targetWords: VocabItem[]): void {
    const fullText = output.paragraphs.join(' ').toLowerCase();
    const missing = targetWords.filter(
      (w) => !fullText.includes(w.word.toLowerCase())
    );

    if (missing.length > 0) {
      const missingList = missing.map((w) => w.word).join(', ');
      throw new Error(
        `AI output missing target words: ${missingList}. Please regenerate.`
      );
    }
  }

  private validateQuestions(output: AIReadingOutput): void {
    for (const q of output.questions) {
      if (!q.options.includes(q.answer)) {
        throw new Error(
          `Question "${q.question}" answer "${q.answer}" not found in options.`
        );
      }
    }
  }
}
