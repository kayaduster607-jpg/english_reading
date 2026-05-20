'use client';

interface HighlightedTextProps {
  text: string;
  words: string[];
}

export function HighlightedText({ text, words }: HighlightedTextProps) {
  if (!words.length) return <>{text}</>;

  const pattern = new RegExp(
    `\\b(${words.map(escapeRegex).join('|')})\\b`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <span key={match.index} className="word-highlight">
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
