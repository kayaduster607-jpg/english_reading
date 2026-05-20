import { NextResponse } from 'next/server';
import { getParser } from '@/server/parsers/parser-factory';
import { VocabAiExtractService } from '@/server/services/vocab-ai-extract.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = String(formData.get('mode') || 'auto');

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let result;

    if (mode === 'ai-assisted') {
      const service = new VocabAiExtractService();
      result = await service.extractFromPdfBuffer({ fileName: file.name, buffer });
    } else {
      const parser = getParser(file.name);
      result = await parser.parse({ fileName: file.name, buffer, contentType: file.type, mode });
    }

    const items = Array.isArray(result.items) ? result.items : [];

    const canUseAiAssist =
      file.name.toLowerCase().endsWith('.pdf') &&
      (items.length === 0 || items.length < 50 || (result.parserReport?.qualityScore ?? 1) < 0.6);

    console.log('[import-preview]', {
      fileName: file.name,
      mode,
      wordCount: items.length,
      warnings: result.warnings,
      parserReport: result.parserReport,
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      items,
      wordCount: items.length,
      warnings: result.warnings || [],
      rawTextPreview: result.rawTextPreview || '',
      parserReport: result.parserReport || null,
      canUseAiAssist,
    });
  } catch (error) {
    console.error('[import-preview failed]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
