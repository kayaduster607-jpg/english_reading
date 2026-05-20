'use client';

import { useEffect, useState } from 'react';
import type { GeneratedReading } from '@/shared/types';

export default function HistoryPage() {
  const [readings, setReadings] = useState<GeneratedReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/readings/history')
      .then((r) => r.json())
      .then((d) => {
        setReadings(d.readings || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">阅读历史</h1>

      {readings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          还没有阅读记录
        </div>
      ) : (
        <div className="space-y-4">
          {readings.map((r) => (
            <a
              key={r.id}
              href={`/readings/${r.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">{r.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{r.guideCn}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded">
                      {r.examTarget.toUpperCase()}
                    </span>
                    <span>{r.cefr}</span>
                    <span>{r.wordCount} words</span>
                    <span>目标词 {r.targetWords.length} 个</span>
                  </div>
                </div>
                <span className="text-sm text-gray-400">{r.date}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
