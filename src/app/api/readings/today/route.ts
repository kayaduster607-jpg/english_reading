import { NextResponse } from 'next/server';
import { ReadingRepository } from '@/server/repositories/reading.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
import { getToday } from '@/shared/date';

export async function GET() {
  try {
    const repo = new ReadingRepository();
    const today = getToday();
    const reading = await repo.getTodayReading(DEFAULT_USER_ID, today);

    return NextResponse.json({ reading });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
