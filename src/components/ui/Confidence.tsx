import { cn } from "@/lib/util";

export function ConfidenceBar({ value, className, animated = false }: { value: number; className?: string; animated?: boolean }) {
  const pct = Math.max(0, Math.min(1, value));
  const color =
    pct >= 0.9 ? "bg-emerald-500" : pct >= 0.75 ? "bg-indigo-500" : pct >= 0.6 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color, animated && "progress-indeterminate")}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="text-[11px] font-mono text-slate-600 tabular-nums w-8 text-right">{(pct * 100).toFixed(0)}%</div>
    </div>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone =
    pct >= 90
      ? "text-emerald-700 border-emerald-200 bg-emerald-50"
      : pct >= 75
      ? "text-indigo-700 border-indigo-200 bg-indigo-50"
      : pct >= 60
      ? "text-amber-700 border-amber-200 bg-amber-50"
      : "text-rose-700 border-rose-200 bg-rose-50";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums", tone)}>
      {pct}% conf
    </span>
  );
}

export function ProgressBar({ value, className, showLabel = true }: { value: number; className?: string; showLabel?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <div className="text-[10.5px] font-medium text-slate-500 tabular-nums">{pct.toFixed(0)}% complete</div>}
    </div>
  );
}
