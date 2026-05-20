'use client';

import { useEffect, useState, useRef } from 'react';
import type { VocabBook } from '@/shared/types';
import { EXAM_LABELS } from '@/shared/constants';

export default function VocabPage() {
  const [books, setBooks] = useState<VocabBook[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VocabBook[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/vocab/books')
      .then((r) => r.json())
      .then((d) => setBooks(d.books || []));
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/vocab/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.book) {
        setBooks((prev) => [...prev, data.book]);
        if (fileRef.current) fileRef.current.value = '';
        alert(`成功导入 ${data.wordCount} 个单词`);
      } else {
        alert(data.error || '上传失败');
      }
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
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
          支持 TXT 和 CSV 格式。TXT 格式每行一个单词，用 Tab 或逗号分隔：单词、释义、词性、例句
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv"
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-[var(--color-primary)] hover:file:bg-green-100"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {uploading ? '导入中...' : '导入'}
          </button>
        </div>
      </section>

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
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            搜索
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((book) => (
              <BookCard key={book.id} book={book} />
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
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookCard({ book }: { book: VocabBook }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[var(--color-primary)] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm">{book.name}</h3>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">
          {book.sourceType === 'builtin' ? '内置' : '上传'}
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-primary)]">{book.wordCount}</p>
      <p className="text-xs text-gray-400 mb-2">个单词</p>
      {book.examTarget && (
        <span className="text-xs px-2 py-0.5 bg-green-50 text-[var(--color-primary)] rounded">
          {EXAM_LABELS[book.examTarget as keyof typeof EXAM_LABELS] || book.examTarget}
        </span>
      )}
    </div>
  );
}
