import Link from "next/link";
import { db } from "@/lib/db";
import { ORGS, SCENARIOS } from "@/lib/seed";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StageBadge, StatusBadge } from "@/components/ui/StageBadge";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Hourglass,
  Rocket,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck,
  Bot,
  Play,
  TrendingUp,
} from "lucide-react";
import { formatMinutes, formatRelative } from "@/lib/util";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { KpiTrendChart } from "@/components/dash/KpiTrendChart";
import { AgentPipelineCard } from "@/components/dash/AgentPipelineCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const upgrades = (await db.upgrades.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const approvals = (await db.approvals.all()).filter((a) => a.status === "pending");
  const activities = (await db.activities.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 30);

  const completed = upgrades.filter((u) => u.status === "completed").length;
  const inProgress = upgrades.filter((u) => u.status === "in_progress").length;
  const waiting = upgrades.filter((u) => u.status === "waiting_human").length;
  const avgMinutes =
    upgrades
      .filter((u) => u.status === "completed" && u.report)
      .reduce((s, u) => s + (u.report?.completionTimeMinutes ?? 0), 0) / Math.max(1, completed);
  const savedHours = upgrades.reduce((s, u) => s + (u.estimatedMinutesSaved ?? 0), 0) / 60;
  const autoActions = upgrades.reduce((s, u) => s + u.autoActions, 0);
  const humanOverrides = upgrades.reduce((s, u) => s + u.humanOverrides, 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-indigo-200 bg-white/10 border border-white/10 rounded-full px-2.5 py-1 mb-3">
              <Sparkles className="h-3 w-3" />
              Multi-agent · GPT-4o Mini · HITL · Auditable
            </div>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight">
              Payments 3.0 upgrades in <span className="text-emerald-300">under 30 minutes</span>
              <br />
              <span className="text-white/80 font-semibold text-[20px]">— not 2 to 3 days of coordination.</span>
            </h1>
            <p className="mt-3 text-[13px] text-indigo-100/85 leading-relaxed">
              Seven specialist agents inspect readiness, plan Salesforce &amp; Stripe changes, apply them safely,
              validate end-to-end, and hand you a signed-off report. Governance holds the wheel — engineers step in
              only where judgment is required.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Link href="/upgrades/new">
              <Button size="lg" className="w-full !bg-white !text-indigo-700 hover:!bg-slate-100 shadow-lift">
                <Rocket size={15} /> Launch new upgrade
              </Button>
            </Link>
            <Link href="/copilot">
              <Button size="lg" variant="outline" className="w-full !bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                <Bot size={15} /> Ask Copilot
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi icon={<Rocket size={13} />} label="Total upgrades" value={upgrades.length} tone="brand" />
        <Kpi icon={<ShieldCheck size={13} />} label="Completed" value={completed} tone="success" />
        <Kpi icon={<Hourglass size={13} />} label="In progress" value={inProgress} tone="info" trend={inProgress > 0 ? "pulsing" : undefined} />
        <Kpi icon={<UserCheck size={13} />} label="Awaiting human" value={waiting} tone={waiting > 0 ? "warning" : "neutral"} />
        <Kpi icon={<Clock size={13} />} label="Avg. duration" value={completed ? formatMinutes(Math.round(avgMinutes || 1)) : "—"} tone="neutral" />
        <Kpi icon={<TimerReset size={13} />} label="Hours saved" value={savedHours ? `${savedHours.toFixed(1)}h` : "—"} tone="success" />
      </div>

      {/* Agent pipeline + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <AgentPipelineCard upgrades={upgrades} activities={activities} className="lg:col-span-3" />
        <Card className="lg:col-span-2">
          <CardHeader
            title="AI cycle-time trend"
            subtitle="AI-driven vs. traditional manual coordination"
            icon={<div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><TrendingUp size={14} /></div>}
            right={<Badge tone="success">Same-day</Badge>}
          />
          <KpiTrendChart upgrades={upgrades} />
        </Card>
      </div>

      {/* Approvals + Autonomy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pending human approvals"
            subtitle="AI-paused decisions awaiting your review"
            icon={<div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><UserCheck size={14} /></div>}
            right={
              <div className="flex items-center gap-2">
                <Badge tone={approvals.length ? "warning" : "success"} dot>{approvals.length} pending</Badge>
                {approvals.length > 0 && (
                  <Link href="/approvals" className="text-[11.5px] font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                    Review all <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            }
          />
          <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
            {approvals.slice(0, 6).map((a) => (
              <Link key={a.id} href={`/approvals`} className="block rounded-xl border border-slate-100 bg-white p-3 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                <div className="flex items-start gap-2.5">
                  <AgentAvatar id={a.agent} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-slate-900 truncate">{a.title}</div>
                    <div className="text-[11.5px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{a.question}</div>
                    <div className="mt-1.5 text-[10.5px] text-slate-400">
                      {formatRelative(a.createdAt)} · {a.options.length} options
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
            {approvals.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck size={17} />
                </div>
                <div className="text-[12px] font-semibold text-slate-900">Queue is clear</div>
                <div className="text-[10.5px] text-slate-500 mt-0.5">All agents are working autonomously.</div>
              </div>
            )}
          </div>
        </Card>
        <AutonomyCard autoActions={autoActions} humanOverrides={humanOverrides} completed={completed} />
      </div>

      {/* Live feed + recent upgrades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent upgrades"
            subtitle={`${upgrades.length} run(s) tracked`}
            icon={<div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Rocket size={13} /></div>}
            right={
              <Link href="/upgrades" className="text-[11.5px] font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100 -mx-5 -mb-5">
            {upgrades.slice(0, 6).map((u) => {
              const org = ORGS.find((o) => o.id === u.orgId);
              const scenario = SCENARIOS.find((s) => s.id === u.scenarioId);
              return (
                <Link
                  key={u.id}
                  href={`/upgrades/${u.id}`}
                  className="group block px-5 py-3.5 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[10.5px] font-bold shrink-0">
                      {(org?.name ?? "??").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-900 truncate">{org?.name ?? u.orgId}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {scenario?.title ?? u.scenarioId} · {formatRelative(u.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StageBadge stage={u.stage} />
                      <StatusBadge status={u.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: `${u.progress}%` }} />
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-500 tabular-nums">{u.progress}%</div>
                  </div>
                </Link>
              );
            })}
            {upgrades.length === 0 && (
              <div className="py-14 text-center">
                <Rocket size={28} className="mx-auto text-slate-300 mb-2" />
                <div className="text-[13px] font-semibold text-slate-900">No upgrades yet</div>
                <div className="text-[11.5px] text-slate-500 mt-1 mb-3">Launch your first Payments 3.0 upgrade.</div>
                <Link href="/upgrades/new"><Button size="sm">Start now</Button></Link>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Live agent feed"
            subtitle="System-wide activity stream"
            icon={<div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Play size={13} /></div>}
            right={<span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />Live</span>}
          />
          <LiveFeed initial={activities} maxHeight={480} />
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "neutral",
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "brand" | "success" | "info" | "warning" | "danger" | "neutral";
  trend?: "pulsing";
}) {
  const cls = {
    brand: "bg-indigo-50 border-indigo-100 text-indigo-700",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
    info: "bg-sky-50 border-sky-100 text-sky-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    danger: "bg-rose-50 border-rose-100 text-rose-700",
    neutral: "bg-slate-50 border-slate-100 text-slate-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft hover:shadow-lift transition-all">
      <div className="flex items-center gap-2">
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center border ${cls}`}>{icon}</span>
        <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</div>
        {trend === "pulsing" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot ml-auto" />}
      </div>
      <div className="mt-2.5 text-[24px] font-bold text-slate-900 tabular-nums leading-none">{value}</div>
    </div>
  );
}

function AutonomyCard({ autoActions, humanOverrides, completed }: { autoActions: number; humanOverrides: number; completed: number }) {
  const total = autoActions + humanOverrides;
  const autoPct = total > 0 ? (autoActions / total) * 100 : 0;
  return (
    <Card>
      <CardHeader
        title="Agent autonomy"
        subtitle="Auto-actions vs. human overrides"
        icon={<div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Bot size={14} /></div>}
      />
      <div className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Autonomy rate</div>
            <div className="text-[22px] font-bold text-slate-900 tabular-nums">
              {total > 0 ? autoPct.toFixed(0) : "—"}
              {total > 0 && <span className="text-[13px] text-slate-500 ml-0.5">%</span>}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${autoPct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SmallStat label="Auto" value={autoActions} tone="success" />
          <SmallStat label="HITL" value={humanOverrides} tone="warning" />
          <SmallStat label="Completed" value={completed} tone="brand" />
        </div>
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11.5px] text-indigo-900 leading-relaxed">
          <span className="font-semibold">Governance rule of thumb:</span> AI holds ≥ 80% of actions autonomously,
          escalating only on low-confidence, elevated permissions, or policy-restricted paths.
        </div>
      </div>
    </Card>
  );
}

function SmallStat({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "brand" }) {
  const cls = {
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    brand: "bg-indigo-50 border-indigo-100 text-indigo-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-2.5 ${cls}`}>
      <div className="text-[9.5px] font-bold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-[16px] font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
