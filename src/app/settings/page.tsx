'use client';

import { useEffect, useState } from 'react';
import type { UserPlan, ExamId, VocabBook } from '@/shared/types';
import { EXAM_IDS, EXAM_LABELS, TOPICS } from '@/shared/constants';

export default function SettingsPage() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [books, setBooks] = useState<VocabBook[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/plan').then((r) => r.json()).then((d) => setPlan(d.plan));
    fetch('/api/vocab/books').then((r) => r.json()).then((d) => setBooks(d.books || []));
  }, []);

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        alert('设置已保存');
      }
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleBook = (bookId: string) => {
    if (!plan) return;
    const active = plan.activeVocabBookIds;
    const next = active.includes(bookId)
      ? active.filter((id) => id !== bookId)
      : [...active, bookId];
    setPlan({ ...plan, activeVocabBookIds: next });
  };

  if (!plan) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">学习设置</h1>

      <div className="space-y-6">
        {/* Exam Target */}
        <Section title="目标考试">
          <div className="grid grid-cols-2 gap-3">
            {EXAM_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setPlan({ ...plan, examTarget: id })}
                className={`px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                  plan.examTarget === id
                    ? 'border-[var(--color-primary)] bg-green-50 text-[var(--color-primary)] font-medium'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {EXAM_LABELS[id]}
              </button>
            ))}
          </div>
        </Section>

        {/* Vocab Books */}
        <Section title="启用词书">
          {books.length === 0 ? (
            <p className="text-sm text-gray-400">还没有词书，请先到词书页面上传</p>
          ) : (
            <div className="space-y-2">
              {books.map((book) => {
                const isActive = plan.activeVocabBookIds.includes(book.id);
                return (
                  <button
                    key={book.id}
                    onClick={() => toggleBook(book.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isActive
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isActive && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={isActive ? 'font-medium text-[var(--color-primary)]' : 'text-gray-600'}>
                        {book.name}
                      </span>
                    </div>
                    <span className="text-gray-400">{book.wordCount} 词</span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Daily Words */}
        <Section title="每日学习量">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">新词数</label>
              <input
                type="number"
                min={1}
                max={30}
                value={plan.dailyNewWords}
                onChange={(e) => setPlan({ ...plan, dailyNewWords: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">复习词数</label>
              <input
                type="number"
                min={1}
                max={30}
                value={plan.dailyReviewWords}
                onChange={(e) => setPlan({ ...plan, dailyReviewWords: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none"
              />
            </div>
          </div>
        </Section>

        {/* Topics */}
        <Section title="偏好主题">
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => {
              const selected = plan.preferredTopics.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => {
                    const topics = selected
                      ? plan.preferredTopics.filter((t) => t !== topic)
                      : [...plan.preferredTopics, topic];
                    setPlan({ ...plan, preferredTopics: topics });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'border-[var(--color-primary)] bg-green-50 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
