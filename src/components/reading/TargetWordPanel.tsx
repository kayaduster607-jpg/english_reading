'use client';

import { useState } from 'react';
import type { ReadingTargetWord, VocabularyInContext } from '@/shared/types';

interface TargetWordPanelProps {
  words: ReadingTargetWord[];
  vocabularyInContext: VocabularyInContext[];
}

export function TargetWordPanel({ words, vocabularyInContext }: TargetWordPanelProps) {
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-base font-semibold mb-4 text-[var(--color-primary)]">
        今日目标词 ({words.length})
      </h3>
      <ul className="space-y-3">
        {words.map((w) => {
          const context = vocabularyInContext.find((v) => v.word === w.word);
          const isExpanded = expandedWord === w.word;

          return (
            <li key={w.word} className="border-b border-gray-50 pb-3 last:border-0">
              <button
                onClick={() => setExpandedWord(isExpanded ? null : w.word)}
                className="w-full text-left"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-[var(--color-primary)]">{w.word}</span>
                  {w.pos && <span className="text-xs text-gray-400">{w.pos}</span>}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{w.meaningCn}</p>
              </button>

              {isExpanded && context && (
                <div className="mt-2 pl-3 border-l-2 border-green-200 text-xs text-gray-500 space-y-1">
                  <p className="italic">&ldquo;{context.sentence}&rdquo;</p>
                  <p>{context.noteCn}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
