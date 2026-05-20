import { NextResponse } from 'next/server';
import { ProgressRepository } from '@/server/repositories/progress.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';

export async function GET() {
  try {
    const repo = new ProgressRepository();
    const progress = await repo.getProgress(DEFAULT_USER_ID);

    // Compute summary stats
    const words = Object.values(progress.words);
    const stats = {
      total: words.length,
      new: words.filter((w) => w.status === 'new').length,
      learning: words.filter((w) => w.status === 'learning').length,
      weak: words.filter((w) => w.status === 'weak').length,
      familiar: words.filter((w) => w.status === 'familiar').length,
      mastered: words.filter((w) => w.status === 'mastered').length,
    };

    return NextResponse.json({ progress, stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
