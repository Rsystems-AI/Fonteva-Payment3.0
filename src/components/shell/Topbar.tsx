"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { LiveIndicator } from "./LiveIndicator";
import { LlmStatus } from "./LlmStatus";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Live view of the Fonteva Payments 3.0 AI upgrade pipeline" },
  "/upgrades": { title: "Upgrade Runs", subtitle: "Every upgrade — queued, in-flight, completed" },
  "/upgrades/new": { title: "Launch Upgrade", subtitle: "Configure a new AI-driven upgrade for any customer org" },
  "/approvals": { title: "Approvals Queue", subtitle: "Human-in-the-loop decisions awaiting your review" },
  "/copilot": { title: "Upgrade Copilot", subtitle: "Ask questions in natural language — powered by GPT-4o Mini" },
  "/agents": { title: "AI Agents", subtitle: "Specialist agents in the orchestration graph" },
  "/systems": { title: "Simulated Systems", subtitle: "Live state of the Salesforce & Stripe simulators" },
  "/audit": { title: "Audit Trail", subtitle: "Tamper-evident chain of every agent + human action" },
};

export function Topbar({ right }: { right?: ReactNode }) {
  const path = usePathname();
  const key = path.startsWith("/upgrades/new")
    ? "/upgrades/new"
    : path.startsWith("/upgrades/")
    ? "/upgrades"
    : path;
  const t = TITLES[key] ?? TITLES["/"];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur px-6 py-3 flex items-center gap-4">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-slate-900 leading-tight truncate">{t.title}</div>
        <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{t.subtitle}</div>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <LlmStatus />
        <LiveIndicator />
        <button
          onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
          title="Refresh"
        >
          <RefreshCw size={12} /> Refresh
        </button>
        {right}
      </div>
    </header>
  );
}
