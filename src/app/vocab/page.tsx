'use client';

import { useEffect, useState, useRef } from 'react';
import type { VocabBook, UserPlan } from '@/shared/types';
import { EXAM_LABELS } from '@/shared/constants';

export default function VocabPage() {
  const [books, setBooks] = useState<VocabBook[]>([]);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VocabBook[]>([]);
  const [savingBookId, setSavingBookId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewItems, setPreviewItems] = useState<Array<{ word: string; pos: string; meaningCn: string; example: string }>>([]);
  const [previewFileName, setPreviewFileName] = useState('');
  const [bookName, setBookName] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

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
      const nextIds = exists
        ? activeBookIds.filter((id) => id !== bookId)
        : [...activeBookIds, bookId];
      await saveActiveVocabBookIds(nextIds);
    } catch {
      alert('更新学习词书失败');
    } finally {
      setSavingBookId(null);
    }
  };

  const handlePreview = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/vocab/import-preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.items) {
        setPreviewItems(data.items);
        setPreviewFileName(data.fileName || file.name);
        setBookName(file.name.replace(/\.[^.]+$/, ''));
        setWarnings(data.warnings || []);
      } else {
        alert(data.error || '解析失败');
      }
    } catch {
      alert('解析失败');
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
      // Refresh plan since import-confirm auto-adds to activeVocabBookIds
      if (data.activeVocabBookIds) {
        setPlan((prev) => prev ? { ...prev, activeVocabBookIds: data.activeVocabBookIds } : prev);
      }
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

  const removePreviewItem = (index: number) => {
    setPreviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePreviewItem = (index: number, field: string, value: string) => {
    setPreviewItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.xlsx,.xls,.pdf"
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-[var(--color-primary)] hover:file:bg-green-100"
          />
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
      {previewItems.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">解析预览 — {previewFileName}</h2>

          {warnings.length > 0 && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          <input
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="词书名称"
            className="w-full mb-4 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none"
          />

          <div className="max-h-[420px] overflow-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 w-8">#</th>
                  <th className="text-left p-2">单词</th>
                  <th className="text-left p-2 w-20">词性</th>
                  <th className="text-left p-2">中文释义</th>
                  <th className="text-left p-2 w-14">操作</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400 text-xs">{index + 1}</td>
                    <td className="p-2">
                      <input value={item.word} onChange={(e) => updatePreviewItem(index, 'word', e.target.value)}
                        className="w-full border border-gray-100 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="p-2">
                      <input value={item.pos} onChange={(e) => updatePreviewItem(index, 'pos', e.target.value)}
                        className="w-full border border-gray-100 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="p-2">
                      <input value={item.meaningCn} onChange={(e) => updatePreviewItem(index, 'meaningCn', e.target.value)}
                        className="w-full border border-gray-100 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="p-2">
                      <button onClick={() => removePreviewItem(index)} className="text-red-500 text-xs hover:text-red-700">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">共 {previewItems.length} 个单词</p>
            <div className="flex gap-3">
              <button onClick={() => setPreviewItems([])} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300">
                取消
              </button>
              <button onClick={handleConfirmImport} className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-dark)] transition-colors">
                确认导入
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">搜索词书</h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索词书名称或考试标签..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            搜索
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                active={activeBookIds.includes(book.id)}
                saving={savingBookId === book.id}
                onToggle={() => toggleBookActive(book.id)}
              />
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
              <BookCard
                key={book.id}
                book={book}
                active={activeBookIds.includes(book.id)}
                saving={savingBookId === book.id}
                onToggle={() => toggleBookActive(book.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookCard({
  book,
  active,
  saving,
  onToggle,
}: {
  book: VocabBook;
  active: boolean;
  saving?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 transition-colors ${
      active ? 'border-[var(--color-primary)] bg-green-50/30' : 'border-gray-200 hover:border-[var(--color-primary)]'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm leading-5">{book.name}</h3>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">
          {book.sourceType === 'builtin' ? '内置' : '上传'}
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-primary)]">{book.wordCount}</p>
      <p className="text-xs text-gray-400 mb-3">个单词</p>
      <div className="flex items-center justify-between gap-3">
        {book.examTarget && (
          <span className="text-xs px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded">
            {EXAM_LABELS[book.examTarget as keyof typeof EXAM_LABELS] || book.examTarget}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={saving}
          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            active
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-[var(--color-primary)]'
          }`}
        >
          {saving ? '保存中...' : active ? '正在学习' : '加入学习'}
        </button>
      </div>
    </div>
  );
}
