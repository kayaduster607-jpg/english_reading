export function getToday(): string {
  const now = new Date();
  return formatDate(now);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYearMonth(dateStr: string): { year: string; month: string } {
  const [year, month] = dateStr.split('-');
  return { year, month };
}

export function getReadingPath(dateStr: string): string {
  const { year, month } = getYearMonth(dateStr);
  return `readings/${year}/${month}/${dateStr}.json`;
}
