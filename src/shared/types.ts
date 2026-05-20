// ==================== Exam Types ====================

export type ExamId =
  | 'zhongkao'
  | 'gaokao'
  | 'cet4'
  | 'cet6'
  | 'postgraduate'
  | 'ielts'
  | 'toefl';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type QuestionType =
  | 'main_idea'
  | 'detail'
  | 'inference'
  | 'vocabulary_in_context';

export type SentenceLength = 'short' | 'medium' | 'medium-long' | 'long';
export type GrammarComplexity = 'low' | 'medium' | 'medium-high' | 'high';

export interface ExamProfile {
  id: ExamId;
  name: string;
  cefr: CefrLevel;
  articleWordCount: { min: number; max: number };
  targetWordCount: { min: number; max: number };
  paragraphCount: { min: number; max: number };
  sentenceLength: SentenceLength;
  grammarComplexity: GrammarComplexity;
  allowedQuestionTypes: QuestionType[];
  style: string;
  difficultyNotes: string[];
}

// ==================== Vocab Types ====================

export interface VocabItem {
  id: string;
  word: string;
  phrase?: string;
  pos?: string;
  phonetic?: string;
  meaningCn: string;
  meaningEn?: string;
  example?: string;
  exampleCn?: string;
  examTags: ExamId[];
  difficulty: number;
  source: string;
  tags?: string[];
}

export type VocabSourceType = 'builtin' | 'uploaded' | 'searched' | 'manual';

export interface VocabBook {
  id: string;
  name: string;
  sourceType: VocabSourceType;
  examTarget?: ExamId;
  language: 'en-cn' | 'en-en' | 'mixed';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type WordStatus = 'new' | 'learning' | 'weak' | 'familiar' | 'mastered';

export interface WordProgress {
  word: string;
  status: WordStatus;
  familiarity: number;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
}

export interface ProgressData {
  userId: string;
  words: Record<string, WordProgress>;
}

// ==================== Reading Types ====================

export interface ReadingTargetWord {
  word: string;
  meaningCn: string;
  pos?: string;
}

export interface VocabularyInContext {
  word: string;
  sentence: string;
  meaningCn: string;
  noteCn: string;
}

export interface ReadingQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  answer: string;
  explanationCn: string;
}

export interface ClozeQuestion {
  id: string;
  sentence: string;
  answer: string;
  hintCn: string;
}

export interface GeneratedReading {
  id: string;
  date: string;
  userId: string;
  examTarget: ExamId;
  cefr: CefrLevel;
  topic: string;
  title: string;
  wordCount: number;
  sourceVocabBookIds: string[];
  targetWords: ReadingTargetWord[];
  guideCn: string;
  paragraphs: string[];
  vocabularyInContext: VocabularyInContext[];
  questions: ReadingQuestion[];
  cloze: ClozeQuestion[];
  createdAt: string;
}

// ==================== User Plan Types ====================

export interface GenerationStyle {
  articleType: 'exam_reading';
  includeChineseGuide: boolean;
  includeQuestions: boolean;
  includeCloze: boolean;
  includeVocabularyPanel: boolean;
}

export interface UserPlan {
  userId: string;
  examTarget: ExamId;
  activeVocabBookIds: string[];
  dailyNewWords: number;
  dailyReviewWords: number;
  articlePerDay: number;
  preferredTopics: string[];
  generationStyle: GenerationStyle;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  createdAt: string;
}

// ==================== Review Types ====================

export type ReviewStatus = 'unknown' | 'vague' | 'familiar' | 'mastered';

export interface ReviewResultItem {
  word: string;
  status: ReviewStatus;
  questionCorrect: boolean;
}

export interface SubmitReviewInput {
  readingId: string;
  results: ReviewResultItem[];
}

export interface ReviewLogEntry {
  date: string;
  readingId: string;
  word: string;
  status: ReviewStatus;
  questionCorrect: boolean;
  timestamp: string;
}

// ==================== AI Types ====================

export interface AIReadingInput {
  examProfile: ExamProfile;
  targetWords: VocabItem[];
  topic?: string;
}

export interface AIReadingOutput {
  topic: string;
  title: string;
  guideCn: string;
  paragraphs: string[];
  vocabularyInContext: VocabularyInContext[];
  questions: ReadingQuestion[];
  cloze: ClozeQuestion[];
}

export interface AIProvider {
  generateReading(input: AIReadingInput): Promise<AIReadingOutput>;
}
