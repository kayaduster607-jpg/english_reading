'use client';

import { useEffect, useState } from 'react';

interface ReadingSummary {
  id: string;
  date: string;
  title: string;
}

interface ProgressStats {
  total: number;
  new: number;
  learning: number;
  weak: number;
  familiar: number;
  mastered: number;
}

interface UserPlan {
  examTarget: string;
  dailyNewWords: number;
  dailyReviewWords: number;
}

export default function DashboardPage() {
  const [todayReading, setTodayReading] = useState<{ id: string; title: string; date: string } | null>(null);
  const [recentReadings, setRecentReadings] = useState<ReadingSummary[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/readings/today').then(r => r.json()).then(d => setTodayReading(d.reading));
    fetch('/api/readings/history').then(r => r.json()).then(d => setRecentReadings(d.readings?.slice(0, 5) || []));
    fetch('/api/user/progress').then(r => r.json()).then(d => setStats(d.stats));
    fetch('/api/user/plan').then(r => r.json()).then(d => setPlan(d.plan));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/readings/generate', { method: 'POST' });
      const data = await res.json();
      if (data.reading) {
        window.location.href = '/today';
      } else {
        alert(data.error || '生成失败');
      }
    } catch {
      alert('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero: Today's Reading */}
      <section className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold mb-2">Today&apos;s Reading</h2>
        <p className="text-gray-500 mb-6">
          为 {plan?.examTarget?.toUpperCase() || 'CET-6'} 生成一篇包含目标词汇的阅读文章
        </p>
        {todayReading ? (
          <div className="flex items-center gap-4">
            <a
              href="/today"
              className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
            >
              查看今日阅读
            </a>
            <span className="text-gray-400 text-sm">{todayReading.title}</span>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成今日阅读'}
          </button>
        )}
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="当前考试" value={plan?.examTarget?.toUpperCase() || 'CET-6'} />
        <StatCard label="每日新词" value={String(plan?.dailyNewWords || 5)} />
        <StatCard label="总词汇量" value={String(stats?.total || 0)} />
        <StatCard label="已掌握" value={String(stats?.mastered || 0)} color="text-green-600" />
      </div>

      {/* Progress Overview */}
      {stats && stats.total > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">词汇掌握进度</h3>
          <div className="flex gap-2 h-6 rounded-full overflow-hidden bg-gray-100">
            {stats.mastered > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(stats.mastered / stats.total) * 100}%` }}
                title={`已掌握: ${stats.mastered}`}
              />
            )}
            {stats.familiar > 0 && (
              <div
                className="bg-blue-400 transition-all"
                style={{ width: `${(stats.familiar / stats.total) * 100}%` }}
                title={`熟悉: ${stats.familiar}`}
              />
            )}
            {stats.learning > 0 && (
              <div
                className="bg-yellow-400 transition-all"
                style={{ width: `${(stats.learning / stats.total) * 100}%` }}
                title={`学习中: ${stats.learning}`}
              />
            )}
            {stats.weak > 0 && (
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${(stats.weak / stats.total) * 100}%` }}
                title={`薄弱: ${stats.weak}`}
              />
            )}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full inline-block" /> 已掌握 {stats.mastered}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-full inline-block" /> 熟悉 {stats.familiar}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" /> 学习中 {stats.learning}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full inline-block" /> 薄弱 {stats.weak}</span>
          </div>
        </section>
      )}

      {/* Recent Readings */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">最近阅读</h3>
        {recentReadings.length === 0 ? (
          <p className="text-gray-400 text-sm">还没有阅读记录，点击上方按钮生成第一篇吧</p>
        ) : (
          <ul className="space-y-3">
            {recentReadings.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="font-medium">{r.title}</span>
                <span className="text-sm text-gray-400">{r.date}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <div className={`text-2xl font-bold ${color || 'text-[var(--color-primary)]'}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
