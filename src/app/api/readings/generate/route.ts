import { NextResponse } from 'next/server';
import { ReadingGenerationService } from '@/server/services/reading-generation.service';
import { DEFAULT_USER_ID } from '@/shared/constants';
import { getToday } from '@/shared/date';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const topic = body.topic as string | undefined;
    const force = body.force === true;

    const service = new ReadingGenerationService();
    const reading = await service.generateTodayReading({
      userId: DEFAULT_USER_ID,
      date: getToday(),
      topic,
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
