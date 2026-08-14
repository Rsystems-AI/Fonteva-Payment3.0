"use client";
import { useState } from "react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { AGENTS } from "@/lib/agents/registry";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceBadge, ConfidenceBar } from "@/components/ui/Confidence";
import type { AgentDecision } from "@/lib/types";
import { formatRelative } from "@/lib/util";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";

export function DecisionCard({ decision }: { decision: AgentDecision }) {
  const [open, setOpen] = useState(false);
  const agent = AGENTS[decision.agent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-2.5">
        <AgentAvatar id={decision.agent} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[13px] font-semibold text-slate-900">{decision.action.replaceAll("_", " ")}</div>
            <ConfidenceBadge value={decision.confidence} />
            {decision.requiresHumanApproval && <Badge tone="warning">HITL</Badge>}
          </div>
          <div className="text-[12px] text-slate-700 mt-1 leading-relaxed">{decision.summary}</div>
          <div className="text-[10.5px] text-slate-400 mt-1">{agent.name} · {formatRelative(decision.createdAt)}</div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Reasoning</div>
            <ul className="space-y-1.5">
              {decision.reasoning.map((r, i) => (
                <li key={i} className="text-[11.5px] text-slate-700 flex gap-1.5 leading-relaxed">
                  <span className="text-indigo-400 shrink-0">▸</span><span>{r}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <ConfidenceBar value={decision.confidence} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Evidence</div>
            <div className="space-y-1.5">
              {decision.evidence.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-[11.5px]">
                  {e.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                  <span className="text-slate-700 truncate">{e.label}</span>
                  <span className="ml-auto text-slate-900 font-mono text-[11px] tabular-nums shrink-0">{String(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
