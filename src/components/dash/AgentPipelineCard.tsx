import { Card, CardHeader } from "@/components/ui/Card";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { AGENT_LIST, AGENTS } from "@/lib/agents/registry";
import { Badge } from "@/components/ui/Badge";
import type { AgentActivity, AgentId, UpgradeRun } from "@/lib/types";
import { Bot, ArrowRight } from "lucide-react";
import { cn } from "@/lib/util";

export function AgentPipelineCard({
  upgrades,
  activities,
  className,
}: {
  upgrades: UpgradeRun[];
  activities: AgentActivity[];
  className?: string;
}) {
  // Determine which agent is currently active across any live upgrade.
  const activeUpgrade = upgrades.find((u) => u.status === "in_progress" || u.status === "waiting_human");
  const activeAgent = activeUpgrade?.currentAgent;

  const activityByAgent = new Map<AgentId, number>();
  for (const a of activities) activityByAgent.set(a.agent, (activityByAgent.get(a.agent) ?? 0) + 1);

  const pipeline = AGENT_LIST.filter((a) => a.id !== "orchestrator" && a.id !== "governance");

  return (
    <Card className={className}>
      <CardHeader
        title="Multi-agent pipeline"
        subtitle="Specialist agents in the orchestration graph, with live activity indicators"
        icon={<div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Bot size={14} /></div>}
        right={
          activeUpgrade ? (
            <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />Active</span>
          ) : (
            <Badge tone="neutral">Idle</Badge>
          )
        }
      />
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {pipeline.map((a, idx) => {
          const active = activeAgent === a.id;
          const count = activityByAgent.get(a.id) ?? 0;
          return (
            <div key={a.id} className="flex items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl transition-all",
                  active ? "bg-indigo-50 ring-2 ring-indigo-200" : "hover:bg-slate-50",
                )}
              >
                <AgentAvatar id={a.id} size={36} active={active} />
                <div className="text-[10.5px] font-semibold text-slate-800 text-center max-w-[80px] leading-tight">
                  {a.name.replace("Agent", "").trim()}
                </div>
                <div className="text-[9px] font-mono text-slate-500 tabular-nums">{count} evt</div>
              </div>
              {idx < pipeline.length - 1 && (
                <ArrowRight size={13} className={cn("shrink-0", active ? "text-indigo-500" : "text-slate-300")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11.5px]">
        <div className="flex items-center gap-1.5 text-slate-600">
          <AgentAvatar id="orchestrator" size={22} />
          <span><span className="font-semibold text-slate-900">{AGENTS.orchestrator.name}</span> conducts the pipeline</span>
        </div>
        <div className="text-slate-400">·</div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <AgentAvatar id="governance" size={22} />
          <span><span className="font-semibold text-slate-900">{AGENTS.governance.name}</span> enforces policy + HITL</span>
        </div>
      </div>
    </Card>
  );
}
