export const HISTORY_KEEP_DAYS = 15;

export function getHistoryCutoffDate(days = HISTORY_KEEP_DAYS): Date {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - days + 1);
  return cutoff;
}

export function isDateWithinDays(dateString: string, days = HISTORY_KEEP_DAYS): boolean {
  const cutoff = getHistoryCutoffDate(days);
  const date = new Date(`${dateString}T00:00:00`);
  return date >= cutoff;
}
