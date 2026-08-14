import { AGENTS } from "@/lib/agents/registry";
import type { AgentId } from "@/lib/types";
import {
  Network,
  ClipboardCheck,
  Settings2,
  Plug,
  TestTube2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/util";

const ICONS = {
  Network,
  ClipboardCheck,
  Settings2,
  Plug,
  TestTube2,
  FileText,
  ShieldCheck,
} as const;

// Soft, enterprise-grade tinted circles.
const COLOR_MAP: Record<string, string> = {
  brand: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  sky: "bg-sky-100 text-sky-700 ring-sky-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  cyan: "bg-cyan-100 text-cyan-700 ring-cyan-200",
};

export function AgentAvatar({
  id,
  size = 32,
  active = false,
  variant = "soft",
}: {
  id: AgentId;
  size?: number;
  active?: boolean;
  variant?: "soft" | "solid";
}) {
  const a = AGENTS[id];
  const IconCmp = ICONS[a.icon as keyof typeof ICONS] ?? Network;
  const cls = variant === "solid"
    ? {
        brand: "bg-indigo-600 text-white",
        sky: "bg-sky-600 text-white",
        emerald: "bg-emerald-600 text-white",
        violet: "bg-violet-600 text-white",
        amber: "bg-amber-600 text-white",
        rose: "bg-rose-600 text-white",
        cyan: "bg-cyan-600 text-white",
      }[a.color] ?? "bg-indigo-600 text-white"
    : COLOR_MAP[a.color] ?? COLOR_MAP.brand;
  return (
    <div className="relative shrink-0">
      <div
        style={{ width: size, height: size }}
        className={cn(
          "rounded-xl flex items-center justify-center",
          cls,
          active && "ring-2 ring-offset-2 ring-offset-white",
        )}
      >
        <IconCmp style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }} />
      </div>
      {active && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse-dot" />
      )}
    </div>
  );
}
