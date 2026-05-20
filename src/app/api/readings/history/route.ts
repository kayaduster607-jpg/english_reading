import { NextResponse } from 'next/server';
import { ReadingRepository } from '@/server/repositories/reading.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get('days') || 15);

    const repo = new ReadingRepository();
    const readings = await repo.listHistory(DEFAULT_USER_ID, { days });

    return NextResponse.json({ readings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
