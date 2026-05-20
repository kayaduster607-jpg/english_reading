'use client';

import { useEffect, useState, useRef } from 'react';
import type { VocabBook, UserPlan } from '@/shared/types';
import { EXAM_LABELS } from '@/shared/constants';

interface ImportPreviewResponse {
  ok?: boolean;
  fileName: string;
  items: Array<{ word: string; pos: string; meaningCn: string; example: string }>;
  wordCount: number;
  warnings: string[];
  rawTextPreview?: string;
  parserReport?: {
    strategyStats?: Record<string, number>;
    estimatedEntryCount?: number;
    qualityScore?: number;
  };
  canUseAiAssist?: boolean;
  error?: string;
}

export default function VocabPage() {
  const [books, setBooks] = useState<VocabBook[]>([]);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VocabBook[]>([]);
  const [savingBookId, setSavingBookId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [previewItems, setPreviewItems] = useState<Array<{ word: string; pos: string; meaningCn: string; example: string }>>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [bookName, setBookName] = useState('');
  const [parseMode, setParseMode] = useState<'auto' | 'inline-numbered' | 'momo-table' | 'ai-assisted'>('auto');
  const previewPageSize = 80;

  useEffect(() => {
    async function loadData() {
      const [booksRes, planRes] = await Promise.all([
        fetch('/api/vocab/books'),
        fetch('/api/user/plan'),
      ]);
      const booksData = await booksRes.json();
      const planData = await planRes.json();
      setBooks(booksData.books || []);
      setPlan(planData.plan || null);
    }
    loadData();
  }, []);

  const activeBookIds = plan?.activeVocabBookIds || [];

  const saveActiveVocabBookIds = async (nextIds: string[]) => {
    if (!plan) return;
    const uniqueIds = Array.from(new Set(nextIds));
    if (uniqueIds.length === 0) { alert('至少选择一本词书进行学习'); return; }

    const res = await fetch('/api/user/plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeVocabBookIds: uniqueIds }),
    });
    const data = await res.json();
    if (data.plan) setPlan(data.plan);
    else throw new Error(data.error || '保存失败');
  };

  const toggleBookActive = async (bookId: string) => {
    if (!plan) return;
    setSavingBookId(bookId);
    try {
      const exists = activeBookIds.includes(bookId);
      const nextIds = exists ? activeBookIds.filter((id) => id !== bookId) : [...activeBookIds, bookId];
      await saveActiveVocabBookIds(nextIds);
    } catch {
      alert('更新学习词书失败');
    } finally {
      setSavingBookId(null);
    }
  };

  const handlePreview = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('请先选择文件'); return; }

    setUploading(true);
    setPreview(null);
    setPreviewItems([]);
    setPreviewPage(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', parseMode);

    try {
      const res = await fetch('/api/vocab/import-preview', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setPreview({ fileName: file.name, items: [], wordCount: 0, warnings: [data.error || '解析失败'] });
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setPreview({
        ok: true,
        fileName: data.fileName || file.name,
        items,
        wordCount: Number(data.wordCount || items.length || 0),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        rawTextPreview: data.rawTextPreview,
        parserReport: data.parserReport,
        canUseAiAssist: Boolean(data.canUseAiAssist),
      });
      setPreviewItems(items);
      setBookName((data.fileName || file.name).replace(/\.[^.]+$/, ''));
    } catch (error) {
      setPreview({ fileName: file.name, items: [], wordCount: 0, warnings: [error instanceof Error ? error.message : '解析失败，请重试'] });
    } finally {
      setUploading(false);
    }
  };

  const handleAiAssistParse = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('请重新选择 PDF 文件'); return; }
    if (!confirm('DeepSeek 辅助解析会更慢，但能兼容更多 PDF 格式。是否继续？')) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'ai-assisted');

    try {
      const res = await fetch('/api/vocab/import-preview', { method: 'POST', body: formData });
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setPreview({
        ok: true,
        fileName: data.fileName || file.name,
        items,
        wordCount: items.length,
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        rawTextPreview: data.rawTextPreview,
        parserReport: data.parserReport,
        canUseAiAssist: false,
      });
      setPreviewItems(items);
      setPreviewPage(1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'AI 辅助解析失败');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!bookName.trim()) { alert('请输入词书名称'); return; }

    const res = await fetch('/api/vocab/import-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookName, items: previewItems }),
    });
    const data = await res.json();

    if (data.book) {
      setBooks((prev) => [...prev, data.book]);
      if (data.activeVocabBookIds) {
        setPlan((prev) => prev ? { ...prev, activeVocabBookIds: data.activeVocabBookIds } : prev);
      }
      setPreview(null);
      setPreviewItems([]);
      setBookName('');
      if (fileRef.current) fileRef.current.value = '';
      alert(`成功导入 ${data.wordCount} 个单词，并已加入学习词书`);
    } else {
      alert(data.error || '确认导入失败');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await fetch(`/api/vocab/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.books || []);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">词书管理</h1>

      {/* Upload Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">上传词书</h2>
        <p className="text-sm text-gray-500 mb-4">
          支持 TXT、CSV、Excel (.xlsx)、PDF 格式。上传后可预览和编辑单词，确认后导入。
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.xlsx,.xls,.pdf"
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-[var(--color-primary)] hover:file:bg-green-100"
          />
          <select
            value={parseMode}
            onChange={(e) => setParseMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="auto">自动识别</option>
            <option value="inline-numbered">编号词表：1. word /音标/ 释义</option>
            <option value="momo-table">表格词书：单词/释义/例句</option>
          </select>
          <button
            onClick={handlePreview}
            disabled={uploading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {uploading ? '解析中...' : '解析预览'}
          </button>
        </div>
      </section>

      {/* Preview Section */}
      {preview && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">解析预览 — {preview.fileName}</h2>

          {preview.warnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              {preview.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400">识别词数</p>
              <p className="text-xl font-semibold text-[var(--color-primary)]">{preview.wordCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400">疑似词条数</p>
              <p className="text-xl font-semibold">{preview.parserReport?.estimatedEntryCount ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400">解析质量</p>
              <p className="text-xl font-semibold">
                {preview.parserReport?.qualityScore ? `${Math.round(preview.parserReport.qualityScore * 100)}%` : '-'}
              </p>
            </div>
          </div>

          <input
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="词书名称"
            className="w-full mb-4 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none"
          />

          {preview.wordCount === 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium mb-2">解析完成，但没有识别出有效单词。</p>
              <p>可能原因：PDF 排版复杂、扫描版 PDF、文字层顺序异常，或者当前解析模式不适合这本词书。</p>
            </div>
          ) : (
            <PreviewTable
              items={previewItems}
              page={previewPage}
              pageSize={previewPageSize}
              onPageChange={setPreviewPage}
              onItemsChange={setPreviewItems}
            />
          )}

          <div className="flex items-center gap-3 mt-4">
            {preview.canUseAiAssist && (
              <button onClick={handleAiAssistParse} disabled={uploading}
                className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50">
                用 DeepSeek 辅助解析
              </button>
            )}
            <button onClick={() => { setPreview(null); setPreviewItems([]); }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300">
              取消
            </button>
            <button onClick={handleConfirmImport} disabled={previewItems.length === 0}
              className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm disabled:opacity-40">
              确认导入
            </button>
          </div>
        </section>
      )}

      {/* Search Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">搜索词书</h2>
        <div className="flex items-center gap-3 mb-4">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索词书名称或考试标签..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none" />
          <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">搜索</button>
        </div>
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((book) => (
              <BookCard key={book.id} book={book} active={activeBookIds.includes(book.id)} saving={savingBookId === book.id} onToggle={() => toggleBookActive(book.id)} />
            ))}
          </div>
        )}
      </section>

      {/* My Books */}
      <section>
        <h2 className="text-lg font-semibold mb-4">我的词书</h2>
        {books.length === 0 ? (
          <p className="text-gray-400 text-sm">还没有词书，请上传或搜索</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} active={activeBookIds.includes(book.id)} saving={savingBookId === book.id} onToggle={() => toggleBookActive(book.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type PreviewItem = { word: string; pos: string; meaningCn: string; example: string };

function PreviewTable({
  items, page, pageSize, onPageChange, onItemsChange,
}: {
  items: PreviewItem[];
  page: number; pageSize: number;
  onPageChange: (page: number) => void;
  onItemsChange: (items: PreviewItem[]) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  const visibleItems = items.slice(start, start + pageSize);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
        <span>共 {items.length} 个单词，当前显示第 {start + 1} - {Math.min(start + pageSize, items.length)} 个</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40">上一页</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40">下一页</button>
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-2 w-12">#</th>
              <th className="text-left p-2">单词</th>
              <th className="text-left p-2 w-28">词性</th>
              <th className="text-left p-2">中文释义</th>
              <th className="text-left p-2 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, localIndex) => {
              const index = start + localIndex;
              return (
                <tr key={index} className="border-t border-gray-100">
                  <td className="p-2 text-gray-400">{index + 1}</td>
                  <td className="p-2">
                    <input value={item.word} onChange={(e) => { const next = [...items]; next[index] = { ...next[index], word: e.target.value }; onItemsChange(next); }}
                      className="w-full border border-gray-100 rounded px-2 py-1" />
                  </td>
                  <td className="p-2">
                    <input value={item.pos} onChange={(e) => { const next = [...items]; next[index] = { ...next[index], pos: e.target.value }; onItemsChange(next); }}
                      className="w-full border border-gray-100 rounded px-2 py-1" />
                  </td>
                  <td className="p-2">
                    <input value={item.meaningCn} onChange={(e) => { const next = [...items]; next[index] = { ...next[index], meaningCn: e.target.value }; onItemsChange(next); }}
                      className="w-full border border-gray-100 rounded px-2 py-1" />
                  </td>
                  <td className="p-2">
                    <button onClick={() => onItemsChange(items.filter((_, i) => i !== index))} className="text-red-500 text-xs">删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookCard({ book, active, saving, onToggle }: { book: VocabBook; active: boolean; saving?: boolean; onToggle: () => void }) {
  return (
    <div className={`bg-white rounded-xl border p-5 transition-colors ${active ? 'border-[var(--color-primary)] bg-green-50/30' : 'border-gray-200 hover:border-[var(--color-primary)]'}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm leading-5">{book.name}</h3>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">{book.sourceType === 'builtin' ? '内置' : '上传'}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-primary)]">{book.wordCount}</p>
      <p className="text-xs text-gray-400 mb-3">个单词</p>
      <div className="flex items-center justify-between gap-3">
        {book.examTarget && (
          <span className="text-xs px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded">
            {EXAM_LABELS[book.examTarget as keyof typeof EXAM_LABELS] || book.examTarget}
          </span>
        )}
        <button type="button" onClick={onToggle} disabled={saving}
          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-[var(--color-primary)]'}`}>
          {saving ? '保存中...' : active ? '正在学习' : '加入学习'}
        </button>
      </div>
    </div>
  );
}
