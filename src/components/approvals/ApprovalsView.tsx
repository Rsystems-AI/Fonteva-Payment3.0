"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ApprovalCard } from "./ApprovalCard";
import { Badge } from "@/components/ui/Badge";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import type { AgentDecision, ApprovalRequest } from "@/lib/types";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { formatRelative } from "@/lib/util";
import { UserCheck, Sparkles } from "lucide-react";

export function ApprovalsView({
  initialApprovals,
  initialDecisions,
}: {
  initialApprovals: ApprovalRequest[];
  initialDecisions: AgentDecision[];
}) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [decisions, setDecisions] = useState(initialDecisions);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/approvals", { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as {
      approvals: ApprovalRequest[];
      joined: Array<{ approval: ApprovalRequest; decision: AgentDecision | null }>;
    };
    setApprovals(j.approvals);
    setDecisions(j.joined.filter((x) => x.decision).map((x) => x.decision!) as AgentDecision[]);
  }, []);

  useEventStream({
    onEvent: (ev) => {
      const e = ev as { type: string };
      if (e.type === "approval_created" || e.type === "approval_resolved" || e.type === "activity") refetch();
    },
  });

  useEffect(() => {
    const t = setInterval(refetch, 5000);
    return () => clearInterval(t);
  }, [refetch]);

  const pending = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const resolved = useMemo(() => approvals.filter((a) => a.status !== "pending").slice(0, 20), [approvals]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          icon={<UserCheck size={16} className="text-amber-600" />}
          bg="bg-amber-50 border-amber-200"
          label="Awaiting your review"
          value={pending.length}
        />
        <StatCard
          icon={<Sparkles size={16} className="text-indigo-600" />}
          bg="bg-indigo-50 border-indigo-200"
          label="Resolved this session"
          value={resolved.length}
        />
        <StatCard
          icon={<span className="text-emerald-600 text-lg font-bold">%</span>}
          bg="bg-emerald-50 border-emerald-200"
          label="Auto-actions rate"
          value={approvals.length === 0 ? "—" : `${Math.round((resolved.length / (resolved.length + Math.max(1, pending.length))) * 100)}%`}
        />
      </div>

      <Card>
        <CardHeader
          title="Pending approvals"
          subtitle="AI has paused these upgrades awaiting an engineer's decision."
          icon={<div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><UserCheck size={15} /></div>}
          right={<Badge tone={pending.length ? "warning" : "success"} dot>{pending.length} pending</Badge>}
        />
        <div className="space-y-3">
          {pending.map((a) => {
            const decision = decisions.find((d) => d.id === a.decisionId) ?? null;
            return <ApprovalCard key={a.id} approval={a} decision={decision} onResolved={refetch} highlighted />;
          })}
          {pending.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <UserCheck size={20} />
              </div>
              <div className="text-[13.5px] font-semibold text-slate-900">All caught up</div>
              <div className="text-[11.5px] text-slate-500 mt-1">Agents are working autonomously. You'll be notified when they need you.</div>
            </div>
          )}
        </div>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader
            title="Recently resolved"
            subtitle="Immutable history of every HITL decision"
            icon={<div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Sparkles size={14} /></div>}
          />
          <div className="space-y-2">
            {resolved.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3">
                <AgentAvatar id={a.agent} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[11.5px] text-slate-600 mt-0.5">
                    Chose: <span className="text-slate-900 font-medium">{a.options.find((o) => o.id === a.chosenOptionId)?.label ?? a.chosenOptionId}</span>
                    {" · "}by <span className="text-slate-900">{a.resolvedBy}</span>
                    {" · "}{formatRelative(a.resolvedAt ?? a.createdAt)}
                  </div>
                  {a.reviewerNote && (
                    <div className="mt-1.5 text-[11.5px] text-slate-700 border-l-2 border-indigo-200 pl-2 italic">
                      &ldquo;{a.reviewerNote}&rdquo;
                    </div>
                  )}
                </div>
                <Badge tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warning"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string | number }) {
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-soft">{icon}</div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-[20px] font-bold text-slate-900 mt-0.5 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}
