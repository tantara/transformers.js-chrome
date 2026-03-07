"use client";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function Progress({
  text,
  percentage,
  total,
}: {
  text: string;
  percentage: number;
  total: number;
}) {
  const pct = percentage ?? 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ocean-text-muted truncate">{text}</span>
        <span className="text-ocean-text-muted ml-2 shrink-0">
          {pct.toFixed(1)}%{total > 0 && ` of ${formatBytes(total)}`}
        </span>
      </div>
      <div className="bg-ocean-shallow h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-ocean-deep h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
