export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function countParagraphWords(paragraphs: string[]): number {
  return paragraphs.reduce((sum, p) => sum + countWords(p), 0);
}
