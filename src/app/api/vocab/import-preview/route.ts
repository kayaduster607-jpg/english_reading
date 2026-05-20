import { NextResponse } from 'next/server';
import { getParser } from '@/server/parsers/parser-factory';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = getParser(file.name);
    const result = await parser.parse({ fileName: file.name, buffer, contentType: file.type });

    return NextResponse.json({
      fileName: file.name,
      items: result.items,
      wordCount: result.items.length,
      warnings: result.warnings,
      rawTextPreview: result.rawTextPreview,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
