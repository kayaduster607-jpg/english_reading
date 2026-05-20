import { NextResponse } from 'next/server';
import { VocabBookRepository } from '@/server/repositories/vocab-book.repository';
import { UserRepository } from '@/server/repositories/user.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
import type { VocabItem } from '@/shared/types';
import { generateId } from '@/shared/id';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookName = String(body.bookName || '').trim();
    const examTarget = body.examTarget ? String(body.examTarget) : undefined;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!bookName) {
      return NextResponse.json({ error: 'bookName is required' }, { status: 400 });
    }

    const items = normalizeItems(rawItems);

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid vocabulary items to import' }, { status: 400 });
    }

    const vocabRepo = new VocabBookRepository();
    const book = await vocabRepo.createUploadedBook({ name: bookName, examTarget, items });

    // Auto-add to active plan
    const userRepo = new UserRepository();
    const plan = await userRepo.getPlan(DEFAULT_USER_ID);
    const activeVocabBookIds = Array.from(new Set([...plan.activeVocabBookIds, book.id]));
    await userRepo.savePlan(DEFAULT_USER_ID, { ...plan, activeVocabBookIds });

    return NextResponse.json({ book, wordCount: items.length, activeVocabBookIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function normalizeItems(rawItems: unknown[]): VocabItem[] {
  const result: VocabItem[] = [];
  const seen = new Set<string>();

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;

    const word = String(obj.word || '').trim();
    const meaningCn = String(obj.meaningCn || '').trim();
    const pos = String(obj.pos || '').trim();
    const example = String(obj.example || '').trim();

    if (!word || !meaningCn) continue;
    if (!/^[A-Za-z][A-Za-z''.\-\s]+$/.test(word)) continue;
    if (!/[一-鿿]/.test(meaningCn)) continue;

    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      id: generateId(),
      word,
      pos: pos || undefined,
      meaningCn,
      example: example || undefined,
      examTags: [],
      difficulty: 2,
      source: 'uploaded',
    });
  }

  return result;
}
