import { NextResponse } from 'next/server';
import { UserRepository } from '@/server/repositories/user.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
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
    const updated = { ...current, ...body, userId: DEFAULT_USER_ID };
    await repo.savePlan(DEFAULT_USER_ID, updated);
    return NextResponse.json({ plan: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
