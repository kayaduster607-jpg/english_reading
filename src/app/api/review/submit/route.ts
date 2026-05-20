import { NextResponse } from 'next/server';
import { ReviewService } from '@/server/services/review.service';
import { DEFAULT_USER_ID } from '@/shared/constants';
import type { SubmitReviewInput } from '@/shared/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitReviewInput;

    if (!body.readingId || !body.results || !Array.isArray(body.results)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const service = new ReviewService();
    await service.submitReview(DEFAULT_USER_ID, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
