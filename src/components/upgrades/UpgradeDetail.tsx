"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StageBadge, StatusBadge } from "@/components/ui/StageBadge";
import { ProgressBar } from "@/components/ui/Confidence";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { StreamingReasoning } from "@/components/upgrades/StreamingReasoning";
import { UpgradeTimeline } from "@/components/upgrades/UpgradeTimeline";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { DecisionCard } from "@/components/upgrades/DecisionCard";
import { UpgradeReportView } from "@/components/upgrades/UpgradeReportView";
import { CopilotWidget } from "@/components/copilot/CopilotWidget";
import { useEventStream } from "@/lib/hooks/useEventStream";
import type {
  AgentActivity,
  AgentDecision,
  ApprovalRequest,
  OrgAccount,
  UpgradeRun,
  UpgradeScenario,
} from "@/lib/types";
import { formatMinutes, formatRelative, cn } from "@/lib/util";
import { AGENTS } from "@/lib/agents/registry";
import {
  Building2,
  Calendar,
  User,
  Zap,
  Timer,
  ShieldCheck,
  Bot,
  Sparkles,
  CheckCircle2,
  Play,
  Loader2,
  ArrowRight,
  Settings2,
  Mail,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";

interface Props {
  upgrade: UpgradeRun;
  org: OrgAccount;
  scenario: UpgradeScenario;
  activities: AgentActivity[];
  decisions: AgentDecision[];
  approvals: ApprovalRequest[];
}

export function UpgradeDetail(props: Props) {
  const [upgrade, setUpgrade] = useState(props.upgrade);
  const [decisions, setDecisions] = useState(props.decisions);
  const [approvals, setApprovals] = useState(props.approvals);
  const [activities, setActivities] = useState(props.activities);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/upgrades/${props.upgrade.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const j = await res.json();
    setUpgrade(j.upgrade);
    setActivities(j.activities);
    setDecisions(j.decisions);
    setApprovals(j.approvals);
  }, [props.upgrade.id]);

  useEventStream({
    upgradeId: upgrade.id,
    onEvent: (ev) => {
      const e = ev as { type: string; activity?: AgentActivity };
      if (e.type === "activity" && e.activity) {
        setActivities((prev) => (prev.some((p) => p.id === e.activity!.id) ? prev : [...prev, e.activity!]));
        if (e.activity.kind !== "thought" && e.activity.kind !== "reasoning_stream") void refetch();
      } else if (e.type === "upgrade_updated" || e.type === "approval_created" || e.type === "approval_resolved") {
        void refetch();
      }
    },
  });

  useEffect(() => {
    if (["completed", "failed", "rolled_back"].includes(upgrade.status)) return;
    const t = setInterval(refetch, 4000);
    return () => clearInterval(t);
  }, [upgrade.status, refetch]);

  const pendingApprovals = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const resolvedApprovals = useMemo(() => approvals.filter((a) => a.status !== "pending"), [approvals]);

  const durationMin =
    upgrade.report?.completionTimeMinutes ?? Math.max(1, Math.round((Date.now() - new Date(upgrade.createdAt).getTime()) / 60_000));
  const running = upgrade.status === "in_progress";

  // Extract the readiness findings from the persisted decisions so we can
  // render the current-vs-target version comparison, running jobs list, and
  // findings prominently at the top of the run detail.
  const readinessFindings = useMemo(() => {
    const decision = decisions.find((d) => d.agent === "readiness" && d.action === "readiness_report");
    if (!decision) return null;
    const evidence = decision.evidence;
    const val = (label: string) => evidence.find((e) => e.label === label)?.value;
    const readinessActivity = activities.find(
      (a) => a.agent === "readiness" && a.kind === "tool_result" && a.title.includes("Salesforce readiness snapshot"),
    );
    const snapshot = readinessActivity?.payload as
      | {
          currentVersion?: string;
          missingPermissions?: string[];
          disabledJobs?: string[];
          outdatedLayouts?: string[];
          missingConnectedApps?: string[];
          connectedStripeAccount?: string | null;
        }
      | undefined;
    return {
      currentVersion: (val("Current package version") as string | undefined) ?? snapshot?.currentVersion ?? props.org.currentPackageVersion,
      targetVersion: (val("Target package version") as string | undefined) ?? props.org.targetPackageVersion,
      missingPermissions: snapshot?.missingPermissions ?? [],
      disabledJobs: snapshot?.disabledJobs ?? [],
      outdatedLayouts: snapshot?.outdatedLayouts ?? [],
      missingWebhookEvents: (val("Missing Stripe webhook events") as number | undefined) ?? 0,
      confidence: decision.confidence,
      summary: decision.summary,
    };
  }, [decisions, activities, props.org.currentPackageVersion, props.org.targetPackageVersion]);

  const initials = props.org.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5 pb-24">
      {/* Header card */}
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[15px] font-bold shrink-0 shadow-lift">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[17px] font-bold text-slate-900">{props.org.name}</div>
              <StageBadge stage={upgrade.stage} dot />
              <StatusBadge status={upgrade.status} />
              {running && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                  <Loader2 size={10} className="animate-spin" />
                  Agents working
                </span>
              )}
            </div>
            <div className="text-[12px] text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {props.org.region} · {props.org.segment}</span>
              <span className="inline-flex items-center gap-1.5"><User className="h-3 w-3" /> {props.org.contact.name}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Launched {formatRelative(upgrade.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px]">v{props.org.currentPackageVersion} → v{props.org.targetPackageVersion}</span>
            </div>
            <div className="mt-1.5 text-[12px] text-slate-600">
              <span className="text-slate-400">Scenario:</span> {props.scenario.title}
            </div>
          </div>
          <div className="w-full sm:w-[340px] shrink-0 space-y-3">
            <ProgressBar value={upgrade.progress} />
            <div className="grid grid-cols-4 gap-2">
              <MiniStat label="Duration" value={formatMinutes(durationMin)} icon={<Timer size={11} />} />
              <MiniStat label="Auto" value={upgrade.autoActions.toString()} icon={<Zap size={11} />} tone="brand" />
              <MiniStat label="HITL" value={upgrade.humanOverrides.toString()} icon={<User size={11} />} tone="warning" />
              <MiniStat label="Risk" value={upgrade.riskFlags.length ? "⚠" : "OK"} icon={<ShieldCheck size={11} />} tone={upgrade.riskFlags.length ? "danger" : "success"} />
            </div>
          </div>
        </div>
      </Card>

      {/* Pending approvals — front & center */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          {pendingApprovals.map((a) => {
            const decision = decisions.find((d) => d.id === a.decisionId) ?? null;
            return <ApprovalCard key={a.id} approval={a} decision={decision} onResolved={refetch} highlighted />;
          })}
        </div>
      )}

      {/* Timeline + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Orchestration timeline"
            subtitle="Each specialist agent's stage in the multi-agent pipeline"
            icon={<div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Bot size={15} /></div>}
          />
          <UpgradeTimeline upgrade={upgrade} activities={activities} approvals={approvals} />
        </Card>
        <Card>
          <CardHeader
            title="Live agent feed"
            subtitle="Every thought, tool call, and decision — streamed"
            icon={<div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Play size={13} /></div>}
            right={running ? <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />Live</span> : null}
          />
          <LiveFeed initial={activities} upgradeId={upgrade.id} maxHeight={520} />
        </Card>
      </div>

      {/* Streaming reasoning */}
      <StreamingReasoning upgradeId={upgrade.id} activities={activities} />

      {/* Readiness findings — current vs target, jobs, findings */}
      {readinessFindings && (
        <Card>
          <CardHeader
            title="Readiness Agent findings"
            subtitle="Version comparison, running jobs, and drift detected in the customer org"
            icon={<div className="h-8 w-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"><ClipboardCheck size={15} /></div>}
            right={<Badge tone={readinessFindings.confidence >= 0.85 ? "success" : "warning"}>
              {(readinessFindings.confidence * 100).toFixed(0)}% confidence
            </Badge>}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Version comparison */}
            <div className="lg:col-span-1 p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Package version</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[10.5px] uppercase font-semibold text-slate-500 mb-1">Current (old)</div>
                  <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[15px] font-bold text-slate-700">
                    v{readinessFindings.currentVersion}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-4" />
                <div className="flex-1">
                  <div className="text-[10.5px] uppercase font-semibold text-emerald-600 mb-1">Target (new)</div>
                  <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 font-mono text-[15px] font-bold text-emerald-700">
                    v{readinessFindings.targetVersion}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11.5px] text-slate-600 leading-relaxed">{readinessFindings.summary}</div>
            </div>

            {/* Running / inactive jobs */}
            <div className="lg:col-span-1 p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Scheduled jobs status</div>
              <ScheduledJobsList activities={activities} disabled={readinessFindings.disabledJobs} />
            </div>

            {/* Findings summary */}
            <div className="lg:col-span-1 p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Findings by the agent</div>
              <ul className="space-y-2 text-[12px]">
                <Finding
                  ok={readinessFindings.outdatedLayouts.length === 0}
                  label={`${readinessFindings.outdatedLayouts.length} outdated page layout(s)`}
                  detail={readinessFindings.outdatedLayouts.slice(0, 2).map((l) => l.split("::")[1]).join(", ")}
                />
                <Finding
                  ok={readinessFindings.disabledJobs.length === 0}
                  label={`${readinessFindings.disabledJobs.length} inactive scheduled job(s)`}
                  detail={readinessFindings.disabledJobs.slice(0, 2).join(", ")}
                />
                <Finding
                  ok={readinessFindings.missingPermissions.length === 0}
                  label={`${readinessFindings.missingPermissions.length} missing permission(s)`}
                  detail={readinessFindings.missingPermissions.join(", ")}
                />
                <Finding
                  ok={readinessFindings.missingWebhookEvents === 0}
                  label={`${readinessFindings.missingWebhookEvents} missing Stripe webhook event(s)`}
                />
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Salesforce & Stripe screens — navigation cards */}
      {(upgrade.salesforceSimulation || upgrade.stripeEmail) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upgrade.salesforceSimulation && (
            <Link href={`/upgrades/${upgrade.id}/salesforce`} className="block group">
              <Card className={cn(
                "h-full transition-all cursor-pointer",
                upgrade.stage === "awaiting_salesforce_simulate" ? "ring-2 ring-amber-300 shadow-lift bg-amber-50/40" : "hover:border-emerald-300 hover:shadow-lift",
              )}>
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Settings2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13.5px] font-semibold text-slate-900">Salesforce Configuration</div>
                      {upgrade.salesforceSimulation.simulated
                        ? <Badge tone="success">Simulated</Badge>
                        : <Badge tone="warning">Awaiting Simulate</Badge>}
                    </div>
                    <div className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                      {upgrade.salesforceSimulation.simulated
                        ? `Applied ${upgrade.salesforceSimulation.appliedSteps.filter((s) => s.status === "applied").length}/${upgrade.salesforceSimulation.appliedSteps.length} planned changes.`
                        : `${upgrade.salesforceSimulation.appliedSteps.length} planned change(s) ready to simulate.`}
                    </div>
                    <div className="mt-2 text-[11.5px] font-medium text-emerald-700 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Salesforce screen <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {upgrade.stripeEmail && (
            <Link href={`/upgrades/${upgrade.id}/stripe`} className="block group">
              <Card className={cn(
                "h-full transition-all cursor-pointer",
                upgrade.stage === "awaiting_stripe_send" ? "ring-2 ring-amber-300 shadow-lift bg-amber-50/40" : "hover:border-violet-300 hover:shadow-lift",
              )}>
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13.5px] font-semibold text-slate-900">Stripe Team Email</div>
                      {upgrade.stripeEmail.sent
                        ? <Badge tone="success">Sent</Badge>
                        : <Badge tone="warning">Awaiting Send</Badge>}
                    </div>
                    <div className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {upgrade.stripeEmail.subject}
                    </div>
                    <div className="mt-2 text-[11.5px] font-medium text-violet-700 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open email review screen <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Decisions */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader
            title="Agent decisions"
            subtitle="Every material choice — reasoning, evidence, confidence"
            icon={<div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><Sparkles size={14} /></div>}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {decisions.map((d) => <DecisionCard key={d.id} decision={d} />)}
          </div>
        </Card>
      )}

      {/* HITL history */}
      {resolvedApprovals.length > 0 && (
        <Card>
          <CardHeader
            title="Human-in-the-loop history"
            subtitle="Every human decision logged with reviewer + note"
            icon={<div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><User size={14} /></div>}
          />
          <div className="space-y-2">
            {resolvedApprovals.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3">
                <AgentAvatar id={a.agent} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[11.5px] text-slate-600 mt-0.5">
                    <span className="text-slate-400">Chose:</span> {a.options.find((o) => o.id === a.chosenOptionId)?.label ?? a.chosenOptionId} · <span className="text-slate-400">by</span> {a.resolvedBy} · {formatRelative(a.resolvedAt ?? a.createdAt)}
                  </div>
                  {a.reviewerNote && <div className="mt-1.5 text-[11.5px] text-slate-700 border-l-2 border-indigo-200 pl-2 italic">&ldquo;{a.reviewerNote}&rdquo;</div>}
                </div>
                <Badge tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warning"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Report */}
      {upgrade.report && (
        <Card>
          <CardHeader
            title="Upgrade completion report"
            subtitle={`Generated by ${AGENTS[upgrade.report.generatedBy].name} on ${new Date(upgrade.report.generatedAt).toLocaleString()}`}
            icon={<div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><CheckCircle2 size={15} /></div>}
            right={<Badge tone="success">{formatMinutes(upgrade.report.completionTimeMinutes)}</Badge>}
          />
          <UpgradeReportView report={upgrade.report} />
        </Card>
      )}

      <CopilotWidget upgradeId={upgrade.id} label={props.org.name} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "brand" | "neutral";
}) {
  const cls = {
    success: "text-emerald-700 bg-emerald-50 border-emerald-100",
    danger: "text-rose-700 bg-rose-50 border-rose-100",
    warning: "text-amber-700 bg-amber-50 border-amber-100",
    brand: "text-indigo-700 bg-indigo-50 border-indigo-100",
    neutral: "text-slate-700 bg-slate-50 border-slate-100",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-2", cls)}>
      <div className="text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-70">{icon} {label}</div>
      <div className="text-[13px] font-bold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function Finding({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2">
      <div className={cn(
        "h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        ok ? "bg-emerald-100" : "bg-amber-100",
      )}>
        {ok ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> : <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[12px] font-medium", ok ? "text-slate-700" : "text-slate-900")}>{label}</div>
        {detail && <div className="text-[10.5px] text-slate-500 truncate">{detail}</div>}
      </div>
    </li>
  );
}

function ScheduledJobsList({ activities, disabled }: { activities: AgentActivity[]; disabled: string[] }) {
  // Try to pull the full scheduled-jobs list from the readiness snapshot payload.
  const readinessAct = activities.find(
    (a) => a.agent === "readiness" && a.kind === "tool_result" && a.title.includes("readiness snapshot"),
  );
  const payload = readinessAct?.payload as
    | { scheduledJobs?: Array<{ name: string; active: boolean }>; disabledJobs?: string[] }
    | undefined;
  const allJobs = payload?.scheduledJobs ?? [];

  if (allJobs.length === 0) {
    // Fall back to the disabled list from decision evidence.
    return (
      <ul className="space-y-1.5 text-[12px]">
        {disabled.length === 0 && <li className="text-slate-500">All scheduled jobs already running.</li>}
        {disabled.map((name) => (
          <li key={name} className="flex items-center gap-2 text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-mono text-[11.5px]">{name}</span>
            <span className="ml-auto text-[10px] font-semibold uppercase text-amber-700">Inactive</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-1.5 text-[12px]">
      {allJobs.map((j) => (
        <li key={j.name} className="flex items-center gap-2 text-slate-700">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", j.active ? "bg-emerald-500 animate-pulse-dot" : "bg-amber-500")} />
          <span className="font-mono text-[11.5px] truncate">{j.name}</span>
          <span className={cn(
            "ml-auto text-[10px] font-semibold uppercase shrink-0",
            j.active ? "text-emerald-700" : "text-amber-700",
          )}>{j.active ? "Running" : "Inactive"}</span>
        </li>
      ))}
    </ul>
  );
}
