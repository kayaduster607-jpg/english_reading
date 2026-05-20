import { NextResponse } from 'next/server';
import { ExamRepository } from '@/server/repositories/exam.repository';

export async function GET() {
  try {
    const repo = new ExamRepository();
    const exams = await repo.listAll();
    return NextResponse.json({ exams });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
