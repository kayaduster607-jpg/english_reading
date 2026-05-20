import { NextResponse } from 'next/server';
import { VocabBookRepository } from '@/server/repositories/vocab-book.repository';

export async function GET() {
  try {
    const repo = new VocabBookRepository();
    const books = await repo.listBooks();
    return NextResponse.json({ books });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
