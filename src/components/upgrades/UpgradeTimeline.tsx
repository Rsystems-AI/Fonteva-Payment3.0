"use client";
import { AGENTS } from "@/lib/agents/registry";
import type { AgentActivity, AgentId, ApprovalRequest, UpgradeRun, UpgradeStage } from "@/lib/types";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelative } from "@/lib/util";
import { CheckCircle2, Clock, Loader2, UserCheck, XCircle } from "lucide-react";

interface Step {
  stage: UpgradeStage;
  label: string;
  agent: AgentId;
}

const STEPS: Step[] = [
  { stage: "readiness", label: "Readiness inspection", agent: "readiness" },
  { stage: "planning", label: "Planning", agent: "salesforce_config" },
  { stage: "awaiting_plan_approval", label: "Plan approval (HITL)", agent: "governance" },
  { stage: "salesforce_config", label: "Salesforce configuration", agent: "salesforce_config" },
  { stage: "awaiting_salesforce_simulate", label: "Simulate Changes (HITL)", agent: "salesforce_config" },
  { stage: "stripe_integration", label: "Stripe email drafted", agent: "stripe_integration" },
  { stage: "awaiting_stripe_send", label: "Send Email (HITL)", agent: "stripe_integration" },
  { stage: "reporting", label: "Reporting", agent: "reporting" },
  { stage: "awaiting_signoff", label: "Engineer sign-off (HITL)", agent: "reporting" },
  { stage: "completed", label: "Completed", agent: "orchestrator" },
];

const STAGE_ORDER: Record<UpgradeStage, number> = {
  queued: 0,
  readiness: 1,
  planning: 2,
  awaiting_plan_approval: 3,
  salesforce_config: 4,
  awaiting_salesforce_simulate: 5,
  stripe_integration: 6,
  awaiting_stripe_send: 7,
  reporting: 8,
  awaiting_signoff: 9,
  completed: 10,
  failed: 10,
  rolled_back: 10,
};

export function UpgradeTimeline({
  upgrade,
  activities,
  approvals,
}: {
  upgrade: UpgradeRun;
  activities: AgentActivity[];
  approvals: ApprovalRequest[];
}) {
  const currentIdx = STAGE_ORDER[upgrade.stage];
  const halted = upgrade.status === "failed" || upgrade.status === "rolled_back";

  return (
    <ol className="relative border-l-2 border-slate-100 pl-5 space-y-2.5">
      {STEPS.map((step, idx) => {
        const stepIdx = STAGE_ORDER[step.stage];
        const state = halted && stepIdx >= currentIdx
          ? "failed"
          : stepIdx < currentIdx
          ? "done"
          : stepIdx === currentIdx
          ? "active"
          : "pending";

        const relevantActivities = activities
          .filter((a) => a.stage === step.stage && a.kind !== "reasoning_stream" && a.kind !== "narrative_stream")
          .slice(-3);
        const stageApprovals = approvals.filter((a) => a.stage === step.stage);

        return (
          <li key={idx} className="relative">
            <div className="absolute -left-[29px] top-1.5">
              <StepMarker state={state} />
            </div>
            <div className={`rounded-xl border p-3 transition-all ${
              state === "active" ? "border-indigo-200 bg-indigo-50/30 shadow-soft" :
              state === "done" ? "border-slate-200 bg-white" :
              state === "failed" ? "border-rose-200 bg-rose-50/30" :
              "border-slate-100 bg-slate-50/40"
            }`}>
              <div className="flex items-center gap-2.5">
                <AgentAvatar id={step.agent} size={26} active={state === "active"} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-slate-900">{step.label}</div>
                  <div className="text-[10.5px] text-slate-500">{AGENTS[step.agent].name}</div>
                </div>
                <StageStateBadge state={state} />
              </div>
              {relevantActivities.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {relevantActivities.map((a) => (
                    <li key={a.id} className="text-[11.5px] text-slate-600 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">{a.title}</span>
                      <span className="text-slate-400 shrink-0">· {formatRelative(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {stageApprovals.map((ap) => (
                <div key={ap.id} className="mt-2 text-[11.5px] font-medium inline-flex items-center gap-1.5 text-amber-700">
                  <UserCheck className="h-3 w-3" />
                  HITL: {ap.status === "pending" ? "awaiting engineer" : ap.status}
                </div>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepMarker({ state }: { state: "done" | "active" | "pending" | "failed" }) {
  if (state === "done") return <div className="h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-white" /></div>;
  if (state === "active") return <div className="h-5 w-5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 flex items-center justify-center animate-pulse-dot"><Loader2 className="h-3 w-3 text-white animate-spin" /></div>;
  if (state === "failed") return <div className="h-5 w-5 rounded-full bg-rose-500 ring-4 ring-rose-100 flex items-center justify-center"><XCircle className="h-3 w-3 text-white" /></div>;
  return <div className="h-5 w-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center"><Clock className="h-3 w-3 text-slate-400" /></div>;
}

function StageStateBadge({ state }: { state: "done" | "active" | "pending" | "failed" }) {
  if (state === "done") return <Badge tone="success">Done</Badge>;
  if (state === "active") return <Badge tone="brand" dot>Running</Badge>;
  if (state === "failed") return <Badge tone="danger">Halted</Badge>;
  return <Badge tone="neutral">Pending</Badge>;
}
