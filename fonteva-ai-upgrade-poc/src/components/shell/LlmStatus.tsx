"use client";
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/util";

export function LlmStatus() {
  const [info, setInfo] = useState<{ provider: string; model: string; live: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/llm/status")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ provider: "mock", model: "MockLLM", live: false }));
  }, []);

  const live = info?.live ?? false;
  return (
    <div
      className={cn(
        "hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-[11.5px] font-medium",
        live ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600",
      )}
      title={live ? `${info?.model} live` : "Deterministic fallback (no API key)"}
    >
      <Brain size={12} className={live ? "text-indigo-600" : "text-slate-400"} />
      <span className="tabular-nums">{live ? info?.model : "Mock LLM"}</span>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />}
    </div>
  );
}
