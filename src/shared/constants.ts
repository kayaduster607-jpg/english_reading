import type { ExamId } from './types';

export const EXAM_IDS: ExamId[] = [
  'zhongkao',
  'gaokao',
  'cet4',
  'cet6',
  'postgraduate',
  'ielts',
  'toefl',
];

export const EXAM_LABELS: Record<ExamId, string> = {
  zhongkao: '中考英语',
  gaokao: '高考英语',
  cet4: '大学英语四级',
  cet6: '大学英语六级',
  postgraduate: '考研英语',
  ielts: '雅思',
  toefl: '托福',
};

export const DEFAULT_USER_ID = 'default';

export const DATA_DIR = 'data';

export const TOPICS = [
  'technology',
  'education',
  'environment',
  'health',
  'culture',
  'work',
  'campus life',
  'social media',
  'travel',
  'science',
  'economy',
  'psychology',
];
