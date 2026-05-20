export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function generateReadingId(date: string, examTarget: string): string {
  return `reading_${date.replace(/-/g, '_')}_${examTarget}`;
}

export function generateBookId(): string {
  return `book_${Date.now().toString(36)}`;
}
