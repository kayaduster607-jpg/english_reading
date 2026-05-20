import type { ExamId } from './types';

export const READING_TARGET_LIMITS: Record<
  ExamId,
  { min: number; max: number; default: number }
> = {
  zhongkao: { min: 4, max: 8, default: 6 },
  gaokao: { min: 6, max: 12, default: 10 },
  cet4: { min: 8, max: 14, default: 12 },
  cet6: { min: 10, max: 18, default: 14 },
  postgraduate: { min: 12, max: 24, default: 18 },
  ielts: { min: 12, max: 24, default: 18 },
  toefl: { min: 12, max: 24, default: 18 },
};

export function normalizeReadingTargetWordCount(
  value: unknown,
  examId: ExamId
): number {
  const limits = READING_TARGET_LIMITS[examId];
  const n = Number(value);
  if (!Number.isFinite(n)) return limits.default;
  return Math.min(limits.max, Math.max(limits.min, Math.round(n)));
}
