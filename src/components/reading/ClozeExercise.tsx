'use client';

import { useState } from 'react';
import type { ClozeQuestion } from '@/shared/types';

interface ClozeExerciseProps {
  questions: ClozeQuestion[];
  onSubmitted?: () => void;
}

export function ClozeExercise({ questions, onSubmitted }: ClozeExerciseProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleChange = (id: string, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-6">完形填空</h3>
      <div className="space-y-6">
        {questions.map((q, i) => {
          const userAnswer = inputs[q.id] || '';
          const isCorrect = showResults && userAnswer.trim().toLowerCase() === q.answer.toLowerCase();
          const isWrong = showResults && userAnswer.trim() && !isCorrect;

          return (
            <div key={q.id}>
              <p className="text-sm text-gray-500 mb-2">提示: {q.hintCn}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="mb-2 font-[var(--font-serif)]">{q.sentence}</p>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    disabled={showResults}
                    placeholder="输入答案"
                    className={`w-full max-w-xs px-3 py-2 border rounded-lg text-sm transition-colors ${
                      isCorrect
                        ? 'border-green-300 bg-green-50'
                        : isWrong
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
                    } outline-none`}
                  />
                  {isWrong && (
                    <p className="text-sm text-green-600 mt-1">正确答案: {q.answer}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!showResults && (
        <button
          onClick={() => { setShowResults(true); onSubmitted?.(); }}
          disabled={Object.keys(inputs).length < questions.length}
          className="mt-6 px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors text-sm disabled:opacity-40"
        >
          检查答案
        </button>
      )}
    </div>
  );
}
