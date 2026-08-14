import { cn } from "@/lib/util";
import { ReactNode } from "react";

const TONES: Record<string, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  brand: "border-indigo-200 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  slate: "border-slate-300 bg-white text-slate-700",
};

export type Tone = keyof typeof TONES;

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full",
        tone === "success" && "bg-emerald-500",
        tone === "warning" && "bg-amber-500",
        tone === "danger" && "bg-rose-500",
        tone === "info" && "bg-sky-500",
        tone === "brand" && "bg-indigo-500",
        tone === "violet" && "bg-violet-500",
        tone === "cyan" && "bg-cyan-500",
        (tone === "neutral" || tone === "slate") && "bg-slate-400",
      )} />}
      {children}
    </span>
  );
}
