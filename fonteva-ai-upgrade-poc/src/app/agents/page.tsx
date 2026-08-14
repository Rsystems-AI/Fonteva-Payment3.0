import { AGENT_LIST, AGENTS } from "@/lib/agents/registry";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/util";
import type { AgentActivity, AgentId } from "@/lib/types";
import { ArrowRight, Bot, Network } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const activities = await db.activities.all();
  const activitiesByAgent = new Map<AgentId, AgentActivity[]>();
  for (const a of activities) {
    const list = activitiesByAgent.get(a.agent) ?? [];
    list.push(a);
    activitiesByAgent.set(a.agent, list);
  }
  for (const list of activitiesByAgent.values()) list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <Card>
        <CardHeader
          title="The multi-agent graph"
          subtitle="Six specialist agents + one orchestrator. Each has narrow scope, clear responsibilities, and traceable outputs."
          icon={<div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Bot size={16} /></div>}
          right={<Badge tone="brand">{AGENT_LIST.length} agents</Badge>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {AGENT_LIST.map((a) => {
            const recent = activitiesByAgent.get(a.id)?.slice(0, 4) ?? [];
            const totalActivity = activitiesByAgent.get(a.id)?.length ?? 0;
            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft hover:shadow-lift transition-all">
                <div className="flex items-start gap-3">
                  <AgentAvatar id={a.id} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13.5px] font-bold text-slate-900">{a.name}</div>
                      <Badge tone={a.role === "Oversight" ? "cyan" : a.role === "Supervisor" ? "brand" : "neutral"}>{a.role}</Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="chip">{totalActivity} events</span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {a.responsibilities.map((r, i) => (
                        <li key={i} className="text-[11.5px] text-slate-700 flex gap-1.5 leading-relaxed">
                          <span className="text-indigo-400 shrink-0">▸</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                    {recent.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Recent activity</div>
                        <ul className="space-y-0.5">
                          {recent.map((r) => (
                            <li key={r.id} className="text-[11px] text-slate-600 truncate">
                              <span className="text-slate-400 tabular-nums">{formatRelative(r.createdAt)}</span> — {r.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Agent collaboration graph"
          subtitle="How work flows through the pipeline — with clear handoffs and escalations."
          icon={<div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center"><Network size={16} /></div>}
        />
        <AgentGraph />
      </Card>
    </div>
  );
}

function AgentGraph() {
  const flow: Array<{ from: AgentId; to: AgentId; kind: string; type: "delegate" | "handoff" | "escalate" | "return" }> = [
    { from: "orchestrator", to: "readiness", kind: "delegate: assess org", type: "delegate" },
    { from: "readiness", to: "salesforce_config", kind: "handoff: propose SF plan", type: "handoff" },
    { from: "readiness", to: "stripe_integration", kind: "handoff: draft Stripe email", type: "handoff" },
    { from: "salesforce_config", to: "governance", kind: "escalate: perm grants", type: "escalate" },
    { from: "stripe_integration", to: "governance", kind: "escalate: email review", type: "escalate" },
    { from: "governance", to: "orchestrator", kind: "return: HITL result", type: "return" },
    { from: "orchestrator", to: "reporting", kind: "delegate: report", type: "delegate" },
    { from: "reporting", to: "orchestrator", kind: "final artifact", type: "return" },
  ];

  const typeCls: Record<typeof flow[number]["type"], string> = {
    delegate: "text-indigo-700 bg-indigo-50 border-indigo-200",
    handoff: "text-cyan-700 bg-cyan-50 border-cyan-200",
    escalate: "text-amber-700 bg-amber-50 border-amber-200",
    return: "text-emerald-700 bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="space-y-1.5">
      {flow.map((f, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition">
          <div className="flex items-center gap-2 w-52 shrink-0">
            <AgentAvatar id={f.from} size={26} />
            <span className="text-[12.5px] font-medium text-slate-900 truncate">{AGENTS[f.from].name}</span>
          </div>
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
          <div className={`text-[10.5px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 ${typeCls[f.type]}`}>
            {f.kind}
          </div>
          <div className="flex items-center gap-2 ml-auto w-52 shrink-0">
            <AgentAvatar id={f.to} size={26} />
            <span className="text-[12.5px] font-medium text-slate-900 truncate">{AGENTS[f.to].name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
