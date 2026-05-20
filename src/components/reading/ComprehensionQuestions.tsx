'use client';

import { useState } from 'react';
import type { ReadingQuestion } from '@/shared/types';

interface ComprehensionQuestionsProps {
  questions: ReadingQuestion[];
  onSubmitted?: () => void;
}

export function ComprehensionQuestions({ questions, onSubmitted }: ComprehensionQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-6">阅读理解</h3>
      <div className="space-y-8">
        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="font-medium mb-3">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-2 ml-4">
              {q.options.map((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                const isSelected = answers[q.id] === opt;
                const isCorrect = opt === q.answer;
                const showCorrect = showResults && isCorrect;
                const showWrong = showResults && isSelected && !isCorrect;

                return (
                  <button
                    key={j}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={showResults}
                    className={`block w-full text-left px-4 py-2 rounded-lg border text-sm transition-colors ${
                      showCorrect
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : showWrong
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {letter}. {opt}
                  </button>
                );
              })}
            </div>
            {showResults && (
              <p className="mt-2 text-sm text-gray-500 ml-4">{q.explanationCn}</p>
            )}
          </div>
        ))}
      </div>
      {!showResults && (
        <button
          onClick={() => { setShowResults(true); onSubmitted?.(); }}
          disabled={Object.keys(answers).length < questions.length}
          className="mt-6 px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors text-sm disabled:opacity-40"
        >
          提交答案
        </button>
      )}
    </div>
  );
}
