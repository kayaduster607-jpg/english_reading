export function GenerationProgress({
  percent,
  message,
}: {
  percent: number;
  message: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-sm">AI 正在生成阅读</p>
        <p className="text-sm text-[var(--color-primary)] font-semibold">{percent}%</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
