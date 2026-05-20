import { NextResponse } from 'next/server';
import { UserRepository } from '@/server/repositories/user.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';
import type { UserPlan } from '@/shared/types';

export async function GET() {
  try {
    const repo = new UserRepository();
    const plan = await repo.getPlan(DEFAULT_USER_ID);
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<UserPlan>;
    const repo = new UserRepository();
    const current = await repo.getPlan(DEFAULT_USER_ID);
    const examTarget = body.examTarget || current.examTarget;

    const updated: UserPlan = {
      ...current,
      ...body,
      userId: DEFAULT_USER_ID,
      examTarget,
      activeVocabBookIds: Array.isArray(body.activeVocabBookIds)
        ? body.activeVocabBookIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : current.activeVocabBookIds,
      dailyNewWords: body.dailyNewWords !== undefined
        ? normalizeDailyWordCount(body.dailyNewWords)
        : current.dailyNewWords,
      dailyReviewWords: body.dailyReviewWords !== undefined
        ? normalizeDailyWordCount(body.dailyReviewWords)
        : current.dailyReviewWords,
      readingTargetWordCount: normalizeReadingTargetWordCount(
        body.readingTargetWordCount ?? body.dailyTargetWords ?? current.readingTargetWordCount,
        examTarget
      ),
    };

    await repo.savePlan(DEFAULT_USER_ID, updated);
    return NextResponse.json({ plan: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function normalizeDailyWordCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.min(300, Math.max(0, Math.round(n)));
}
