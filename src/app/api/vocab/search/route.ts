import { NextResponse } from 'next/server';
import { VocabBookRepository } from '@/server/repositories/vocab-book.repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').toLowerCase();

    const repo = new VocabBookRepository();
    const allBooks = await repo.listBooks();

    const results = query
      ? allBooks.filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.tags.some((t) => t.includes(query)) ||
            b.examTarget?.includes(query)
        )
      : allBooks;

    return NextResponse.json({ books: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
