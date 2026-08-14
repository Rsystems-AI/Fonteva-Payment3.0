"use client";
import { useState } from "react";
import Link from "next/link";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { AGENTS } from "@/lib/agents/registry";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfidenceBar } from "@/components/ui/Confidence";
import { showToast } from "@/components/ui/Toast";
import type { AgentDecision, ApprovalRequest } from "@/lib/types";
import { formatRelative, cn } from "@/lib/util";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface Props {
  approval: ApprovalRequest;
  decision: AgentDecision | null;
  onResolved?: () => void;
  compact?: boolean;
  highlighted?: boolean;
}

export function ApprovalCard({ approval, decision, onResolved, compact, highlighted }: Props) {
  const [chosen, setChosen] = useState<string | null>(
    approval.options.find((o) => o.recommended)?.id ?? approval.options[0]?.id ?? null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(!compact);

  async function submit(action: "approve" | "reject" | "change") {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chosenOptionId: chosen, reviewerNote: note || undefined, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({
        type: action === "reject" ? "error" : "success",
        title: action === "reject" ? "Approval rejected" : "Decision recorded",
        message: `Choice: ${approval.options.find((o) => o.id === chosen)?.label}`,
      });
      onResolved?.();
    } catch (e) {
      setError(String(e));
      showToast({ type: "error", title: "Could not submit approval", message: String(e) });
    } finally {
      setBusy(false);
    }
  }

  const rec = approval.options.find((o) => o.recommended);

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 shadow-lift",
        highlighted ? "border-amber-300 bg-amber-50/40 animate-slide-in" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[15px] font-bold text-slate-900">{approval.title}</div>
            <Badge tone="warning" dot>HITL required</Badge>
            <Badge tone="neutral">by {AGENTS[approval.agent].name}</Badge>
          </div>
          <div className="text-[13px] text-slate-700 mt-1.5 leading-relaxed">{approval.question}</div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
            <span>{formatRelative(approval.createdAt)}</span>
            {approval.upgradeId && (
              <>
                <span>·</span>
                <Link href={`/upgrades/${approval.upgradeId}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                  open upgrade <ExternalLink size={10} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {decision && (
        <div className="mt-4">
          <button
            onClick={() => setShowReasoning((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-700 hover:text-indigo-800"
          >
            {showReasoning ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Agent reasoning · {(decision.confidence * 100).toFixed(0)}% confidence
          </button>
          {showReasoning && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AgentAvatar id={decision.agent} size={22} />
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reasoning trace</div>
                </div>
                <ul className="space-y-1.5">
                  {decision.reasoning.map((r, i) => (
                    <li key={i} className="text-[11.5px] text-slate-700 flex gap-1.5 leading-relaxed">
                      <span className="text-indigo-500 shrink-0">▸</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <ConfidenceBar value={decision.confidence} />
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Evidence</div>
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
      )}

      <div className="mt-4">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Choose an action</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {approval.options.map((opt) => {
            const active = chosen === opt.id;
            const riskTone: "danger" | "warning" | "success" = opt.risk === "high" ? "danger" : opt.risk === "medium" ? "warning" : "success";
            return (
              <button
                key={opt.id}
                onClick={() => setChosen(opt.id)}
                className={cn(
                  "text-left p-3.5 rounded-xl border-2 transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50/40 shadow-soft"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 grid place-items-center shrink-0",
                      active ? "border-indigo-500" : "border-slate-300",
                    )}
                  >
                    {active && <div className="h-2 w-2 rounded-full bg-indigo-500" />}
                  </div>
                  <div className="text-[12.5px] font-semibold text-slate-900 flex-1">{opt.label}</div>
                  {opt.recommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold">
                      <Sparkles className="h-2.5 w-2.5" />
                      recommended
                    </span>
                  )}
                  {opt.risk && <Badge tone={riskTone}>{opt.risk}</Badge>}
                </div>
                {opt.description && <div className="mt-1 pl-6 text-[11px] text-slate-600 leading-relaxed">{opt.description}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reviewer note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="This note is attached to the audit trail and final report…"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => submit("approve")} disabled={busy || !chosen}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Approve & continue
        </Button>
        {rec && chosen && chosen !== rec.id && (
          <Button variant="secondary" onClick={() => submit("change")} disabled={busy}>
            Override recommendation
          </Button>
        )}
        <Button variant="danger" onClick={() => submit("reject")} disabled={busy}>
          <XCircle size={14} /> Reject
        </Button>
        {error && <div className="text-[12px] text-rose-700">{error}</div>}
      </div>
    </div>
  );
}
