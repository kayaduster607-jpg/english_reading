'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { GeneratedReading } from '@/shared/types';
import { HighlightedText } from '@/components/reading/HighlightedText';
import { TargetWordPanel } from '@/components/reading/TargetWordPanel';
import { ComprehensionQuestions } from '@/components/reading/ComprehensionQuestions';
import { ClozeExercise } from '@/components/reading/ClozeExercise';

export default function ReadingDetailPage() {
  const params = useParams();
  const [reading, setReading] = useState<GeneratedReading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from history and find by id
    fetch('/api/readings/history')
      .then((r) => r.json())
      .then((d) => {
        const found = d.readings?.find((r: GeneratedReading) => r.id === params.id);
        setReading(found || null);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;
  }

  if (!reading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">
        未找到该阅读文章
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{reading.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded font-medium">
            {reading.examTarget.toUpperCase()}
          </span>
          <span>{reading.cefr}</span>
          <span>{reading.wordCount} words</span>
          <span>{reading.date}</span>
        </div>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-700">{reading.guideCn}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="reading-body space-y-5">
              {reading.paragraphs.map((p, i) => (
                <p key={i}>
                  <HighlightedText text={p} words={reading.targetWords.map((w) => w.word)} />
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <TargetWordPanel words={reading.targetWords} vocabularyInContext={reading.vocabularyInContext} />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ComprehensionQuestions questions={reading.questions} />
        <ClozeExercise questions={reading.cloze} />
      </div>
    </div>
  );
}
