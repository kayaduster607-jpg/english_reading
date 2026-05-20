'use client';

import { useEffect, useState } from 'react';
import type { WordProgress } from '@/shared/types';

interface ProgressResponse {
  progress: {
    words: Record<string, WordProgress>;
  };
  stats: {
    total: number;
    new: number;
    learning: number;
    weak: number;
    familiar: number;
    mastered: number;
  };
}

export default function ReviewPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/user/progress')
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  if (!data) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;
  }

  const words = Object.values(data.progress.words);
  const filtered = filter === 'all'
    ? words
    : words.filter((w) => w.status === filter);

  const sorted = filtered.sort((a, b) => {
    const order = { weak: 0, learning: 1, new: 2, familiar: 3, mastered: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">词汇复习</h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <FilterButton label="全部" count={data.stats.total} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterButton label="薄弱" count={data.stats.weak} active={filter === 'weak'} onClick={() => setFilter('weak')} color="red" />
        <FilterButton label="学习中" count={data.stats.learning} active={filter === 'learning'} onClick={() => setFilter('learning')} color="yellow" />
        <FilterButton label="熟悉" count={data.stats.familiar} active={filter === 'familiar'} onClick={() => setFilter('familiar')} color="blue" />
        <FilterButton label="已掌握" count={data.stats.mastered} active={filter === 'mastered'} onClick={() => setFilter('mastered')} color="green" />
      </div>

      {/* Word List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          暂无词汇记录，完成阅读后会自动记录
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((w) => (
            <div
              key={w.word}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-lg">{w.word}</span>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>见过 {w.seenCount} 次</span>
                  <span>正确 {w.correctCount}</span>
                  <span>错误 {w.wrongCount}</span>
                  <span>熟悉度 {w.familiarity}/5</span>
                </div>
              </div>
              <StatusBadge status={w.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ label, count, active, onClick, color }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'border-red-300 bg-red-50 text-red-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    blue: 'border-blue-300 bg-blue-50 text-blue-700',
    green: 'border-green-300 bg-green-50 text-green-700',
  };

  return (
    <button
      onClick={onClick}
      className={`text-center p-3 rounded-xl border transition-colors ${
        active
          ? color ? colorClasses[color] : 'border-[var(--color-primary)] bg-green-50 text-[var(--color-primary)]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="text-xl font-bold">{count}</div>
      <div className="text-xs">{label}</div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    new: { label: '新词', cls: 'bg-gray-100 text-gray-600' },
    learning: { label: '学习中', cls: 'bg-yellow-100 text-yellow-700' },
    weak: { label: '薄弱', cls: 'bg-red-100 text-red-700' },
    familiar: { label: '熟悉', cls: 'bg-blue-100 text-blue-700' },
    mastered: { label: '已掌握', cls: 'bg-green-100 text-green-700' },
  };
  const c = config[status] || config.new;
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
}
