import { NextResponse } from 'next/server';
import { ReadingGenerationService } from '@/server/services/reading-generation.service';
import { UserRepository } from '@/server/repositories/user.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
import { getToday } from '@/shared/date';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === 'string' ? body.topic : undefined;
    const force = body.force === true;

    const vocabBookIds = Array.isArray(body.vocabBookIds)
      ? body.vocabBookIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : undefined;

    const userRepo = new UserRepository();
    const plan = await userRepo.getPlan(DEFAULT_USER_ID);

    const targetWordCount =
      body.targetWordCount !== undefined
        ? normalizeReadingTargetWordCount(body.targetWordCount, plan.examTarget)
        : undefined;

    const service = new ReadingGenerationService();
    const reading = await service.generateTodayReading({
      userId: DEFAULT_USER_ID,
      date: getToday(),
      topic,
      vocabBookIds,
      targetWordCount,
      force,
    });

    return NextResponse.json({ reading });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
