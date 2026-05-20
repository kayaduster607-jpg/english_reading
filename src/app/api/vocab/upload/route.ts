import { NextResponse } from 'next/server';
import { VocabBookRepository } from '@/server/repositories/vocab-book.repository';
import { getParser } from '@/server/parsers/parser-factory';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bookName = (formData.get('bookName') as string) || '';
    const examTarget = (formData.get('examTarget') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();
    const parser = getParser(file.name);
    const items = parser.parse(content, file.name);

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid vocabulary items found in file' },
        { status: 400 }
      );
    }

    const repo = new VocabBookRepository();
    const book = await repo.createUploadedBook({
      name: bookName || file.name.replace(/\.[^.]+$/, ''),
      examTarget,
      items,
    });

    return NextResponse.json({ book, wordCount: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
