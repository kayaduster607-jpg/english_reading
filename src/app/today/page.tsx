'use client';

import { useEffect, useState, useCallback } from 'react';
import type { GeneratedReading, ReviewResultItem, VocabBook, UserPlan } from '@/shared/types';
import { HighlightedText } from '@/components/reading/HighlightedText';
import { TargetWordPanel } from '@/components/reading/TargetWordPanel';
import { ComprehensionQuestions } from '@/components/reading/ComprehensionQuestions';
import { ClozeExercise } from '@/components/reading/ClozeExercise';
import { GenerationProgress } from '@/components/reading/GenerationProgress';

export default function TodayPage() {
  const [reading, setReading] = useState<GeneratedReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [topic, setTopic] = useState('');
  const [books, setBooks] = useState<VocabBook[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [clozeSubmitted, setClozeSubmitted] = useState(false);
  const [targetWordCount, setTargetWordCount] = useState(14);
  const [generationPercent, setGenerationPercent] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');

  useEffect(() => {
    fetch('/api/readings/today').then((r) => r.json()).then((d) => {
      setReading(d.reading);
      setLoading(false);
    });
    fetch('/api/vocab/books').then((r) => r.json()).then((d) => setBooks(d.books || []));
    fetch('/api/user/plan').then((r) => r.json()).then((d) => {
      const plan = d.plan as UserPlan;
      setSelectedBookIds(plan.activeVocabBookIds || []);
      setTargetWordCount(plan.readingTargetWordCount || 14);
    });
  }, []);

  const handleGenerate = async (force = false) => {
    if (force && !confirm('确定要重新生成吗？当前文章将被覆盖。')) return;
    if (selectedBookIds.length === 0) { alert('请至少选择一本词书'); return; }

    setGenerating(true);
    setGenerationPercent(5);
    setGenerationMessage('正在准备生成任务...');

    try {
      const res = await fetch('/api/readings/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || undefined, vocabBookIds: selectedBookIds, targetWordCount, force }),
      });

      if (!res.body) throw new Error('浏览器不支持流式响应');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((item) => item.startsWith('data: '));
          if (!line) continue;

          const event = JSON.parse(line.replace(/^data:\s*/, ''));

          if (typeof event.percent === 'number') setGenerationPercent(event.percent);
          if (event.message) setGenerationMessage(event.message);

          if (event.type === 'done' && event.reading) {
            setReading(event.reading);
            setQuestionSubmitted(false);
            setClozeSubmitted(false);
            setGenerationPercent(100);
            setGenerationMessage('生成完成');
          }

          if (event.type === 'error') {
            throw new Error(event.message || '生成失败');
          }
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleReviewSubmit = useCallback(async (results: ReviewResultItem[]) => {
    if (!reading) return;
    try {
      await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId: reading.id, results }),
      });
      setSubmitted(true);
    } catch {
      alert('提交失败');
    }
  }, [reading]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;
  }

  if (!reading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">今日阅读</h2>
        <p className="text-gray-500 mb-6">选择词书和主题，生成今日阅读</p>

        {generating && (
          <GenerationProgress percent={generationPercent} message={generationMessage} />
        )}

        {/* Vocab Book Selection */}
        {books.length > 0 && (
          <div className="mb-6 text-left">
            <p className="text-sm font-medium mb-3">选择本次生成使用的词书</p>
            <div className="space-y-2">
              {books.map((book) => {
                const checked = selectedBookIds.includes(book.id);
                return (
                  <label key={book.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{book.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{book.wordCount} words</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedBookIds((prev) =>
                          e.target.checked ? [...prev, book.id] : prev.filter((id) => id !== book.id)
                        );
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="输入文章主题（可选，如 technology, campus life）"
            className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
          />
          <div className="max-w-md">
            <label className="block text-sm text-gray-500 mb-1">本篇目标词数量</label>
            <input
              type="number"
              min={3}
              max={30}
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              今日学习词量可以很大，但一篇阅读建议只嵌入 8-24 个目标词
            </p>
          </div>
        </div>
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium disabled:opacity-50"
        >
          {generating ? 'AI 正在生成中...' : '生成今日阅读'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{reading.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded font-medium">{reading.examTarget.toUpperCase()}</span>
              <span>{reading.cefr}</span>
              <span>{reading.wordCount} words</span>
              <span>{reading.date}</span>
            </div>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
          >
            {generating ? '生成中...' : '重新生成'}
          </button>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-700">{reading.guideCn}</p>
      </div>

      {/* Main Content: Two Column Layout */}
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

      {/* Questions */}
      <div className="space-y-8 mb-12">
        <ComprehensionQuestions questions={reading.questions} onSubmitted={() => setQuestionSubmitted(true)} />
        <ClozeExercise questions={reading.cloze} onSubmitted={() => setClozeSubmitted(true)} />
      </div>

      {/* Full Translation */}
      {questionSubmitted && clozeSubmitted && reading.translationCn && reading.translationCn.length > 0 && (
        <FullTranslation paragraphs={reading.paragraphs} translationCn={reading.translationCn} />
      )}

      {/* Submit Review */}
      {!submitted ? (
        <ReviewSubmitSection reading={reading} onSubmit={handleReviewSubmit} />
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-lg font-semibold text-[var(--color-primary)]">复习结果已提交</p>
          <p className="text-sm text-gray-500 mt-2">系统已更新你的词汇掌握状态</p>
        </div>
      )}
    </div>
  );
}

function FullTranslation({ paragraphs, translationCn }: { paragraphs: string[]; translationCn: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-12">
      <h3 className="text-lg font-semibold mb-6">全文翻译</h3>
      <div className="space-y-6">
        {paragraphs.map((paragraph, index) => (
          <div key={index} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
            <p className="text-sm text-gray-400 mb-2">Paragraph {index + 1}</p>
            <p className="font-[var(--font-serif)] text-gray-700 mb-3 leading-7">{paragraph}</p>
            <p className="text-gray-800 leading-7">{translationCn[index]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewSubmitSection({
  reading,
  onSubmit,
}: {
  reading: GeneratedReading;
  onSubmit: (results: ReviewResultItem[]) => void;
}) {
  const [results, setResults] = useState<Record<string, ReviewResultItem>>({});

  const setStatus = (word: string, status: ReviewResultItem['status']) => {
    setResults((prev) => ({
      ...prev,
      [word]: { ...prev[word], word, status, questionCorrect: prev[word]?.questionCorrect ?? true },
    }));
  };

  const allWordsRated = reading.targetWords.every((w) => results[w.word]?.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">词汇自测</h3>
      <p className="text-sm text-gray-500 mb-6">标记你对每个目标词的掌握程度</p>
      <div className="space-y-4">
        {reading.targetWords.map((w) => (
          <div key={w.word} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="w-32 font-medium">{w.word}</div>
            <div className="flex gap-2">
              {(['unknown', 'vague', 'familiar', 'mastered'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatus(w.word, status)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    results[w.word]?.status === status
                      ? status === 'unknown' ? 'bg-red-100 border-red-300 text-red-700'
                        : status === 'vague' ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                        : status === 'familiar' ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-green-100 border-green-300 text-green-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {status === 'unknown' ? '不认识' : status === 'vague' ? '模糊' : status === 'familiar' ? '认识' : '已掌握'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit(Object.values(results))}
        disabled={!allWordsRated}
        className="mt-6 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-40"
      >
        提交复习结果
      </button>
    </div>
  );
}
