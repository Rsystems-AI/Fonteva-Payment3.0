"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useEventStream } from "@/lib/hooks/useEventStream";
import type { OrgAccount, SalesforceSimulation, UpgradeRun } from "@/lib/types";
import { cn, formatRelative } from "@/lib/util";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cloud,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  Package,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  Zap,
} from "lucide-react";

export function SalesforceSimulateView({ upgrade: initial, org }: { upgrade: UpgradeRun; org: OrgAccount }) {
  const [upgrade, setUpgrade] = useState(initial);
  const [simulating, setSimulating] = useState(false);

  const refetch = useCallback(async () => {
    const r = await fetch(`/api/upgrades/${initial.id}`, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setUpgrade(j.upgrade);
  }, [initial.id]);

  useEventStream({
    upgradeId: upgrade.id,
    onEvent: (ev) => {
      const e = ev as { type: string };
      if (e.type === "activity" || e.type === "upgrade_updated" || e.type === "approval_resolved") {
        void refetch();
      }
    },
  });

  // Poll every 2s while simulate is in-flight so the applied-steps list animates.
  useEffect(() => {
    if (upgrade.stage === "salesforce_config" && !upgrade.salesforceSimulation?.simulated) {
      const t = setInterval(refetch, 1500);
      return () => clearInterval(t);
    }
  }, [upgrade.stage, upgrade.salesforceSimulation?.simulated, refetch]);

  const sim = upgrade.salesforceSimulation;
  const canSimulate = upgrade.stage === "awaiting_salesforce_simulate" && sim && !sim.simulated;
  const alreadySimulated = !!sim?.simulated;
  const notReady = !sim;

  const targetVersion = upgrade.overrides?.targetVersion ?? org.targetPackageVersion;

  // Reasons Simulate might be disabled other than "no plan yet".
  const blocker: { label: string; hint: string; href?: string; icon: typeof Lock } | null = (() => {
    if (alreadySimulated || canSimulate || notReady) return null;
    if (upgrade.stage === "awaiting_plan_approval") {
      return {
        label: "Waiting for plan approval",
        hint: "The plan must be approved by an engineer before Salesforce changes can be simulated. Head to the run detail and approve the plan.",
        href: `/upgrades/${upgrade.id}`,
        icon: UserCheck,
      };
    }
    if (upgrade.stage === "stripe_integration" || upgrade.stage === "awaiting_stripe_send") {
      return {
        label: "Salesforce step already completed",
        hint: "The run has moved on to the Stripe email step. Open the Stripe screen to send the drafted email.",
        href: `/upgrades/${upgrade.id}/stripe`,
        icon: Mail,
      };
    }
    if (["reporting", "awaiting_signoff", "completed", "failed", "rolled_back"].includes(upgrade.stage)) {
      return {
        label: "Simulate step already passed",
        hint: "The workflow has moved beyond the Salesforce simulate step. Reopen the run to see the current state.",
        href: `/upgrades/${upgrade.id}`,
        icon: AlertTriangle,
      };
    }
    return {
      label: "Not yet at the simulate step",
      hint: `Current stage: ${upgrade.stage}. Simulate unlocks when the plan is approved.`,
      href: `/upgrades/${upgrade.id}`,
      icon: Lock,
    };
  })();

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const r = await fetch(`/api/upgrades/${upgrade.id}/salesforce/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolvedBy: "engineer" }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        showToast({ type: "error", title: "Simulate failed", message: j.error || "unknown_error" });
      } else {
        showToast({ type: "success", title: "Simulate started", message: "The Salesforce Config Agent is applying the plan." });
      }
    } catch (e) {
      showToast({ type: "error", title: "Simulate failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      // Keep the button disabled briefly while orchestrator picks up work.
      setTimeout(() => setSimulating(false), 1500);
      void refetch();
    }
  };

  const permsToGrant = sim?.permsToGrant ?? [];
  const metadataToUpsert = sim?.metadataToUpsert ?? [];
  const jobsToActivate = sim?.jobsToActivate ?? [];
  const layoutsToUpgrade = sim?.layoutsToUpgrade ?? [];
  const appliedSteps = sim?.appliedSteps ?? [];

  const appliedCount = appliedSteps.filter((s) => s.status === "applied").length;
  const totalCount = appliedSteps.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((appliedCount / totalCount) * 100);

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/upgrades/${upgrade.id}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900 mb-1.5"
          >
            <ArrowLeft size={13} /> Back to upgrade run
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Settings2 size={17} />
            </div>
            <div>
              <div className="text-[18px] font-bold text-slate-900">Salesforce Configuration Agent</div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {org.name} · Simulated Salesforce org · Payments v{org.currentPackageVersion} → v{targetVersion}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alreadySimulated ? (
            <Badge tone="success" dot>Simulated</Badge>
          ) : canSimulate ? (
            <Badge tone="warning" dot>Awaiting Simulate</Badge>
          ) : notReady ? (
            <Badge tone="neutral">Plan not ready</Badge>
          ) : blocker ? (
            <Badge tone="warning" dot>{blocker.label}</Badge>
          ) : (
            <Badge tone="brand" dot>Applying…</Badge>
          )}
        </div>
      </div>

      {/* Blocker banner — shown when the plan is ready but the run isn't at the simulate gate yet. */}
      {blocker && (
        <Card className="bg-amber-50/60 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <blocker.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-amber-900">{blocker.label}</div>
              <div className="text-[11.5px] text-amber-800 mt-0.5 leading-relaxed">{blocker.hint}</div>
            </div>
            {blocker.href && (
              <Link href={blocker.href}>
                <Button variant="outline" className="!border-amber-300 !text-amber-900 hover:!bg-amber-100">
                  Go there <ArrowRight size={13} />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Version banner */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <VersionCell label="Current package" value={`v${org.currentPackageVersion}`} tone="slate" />
          <div className="flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-slate-400" />
          </div>
          <VersionCell label="Target package" value={`v${targetVersion}`} tone="emerald" />
          <VersionCell
            label="Simulated org"
            value={org.stripeAccountId.startsWith("acct_") ? org.id : org.id}
            tone="brand"
            small
          />
        </div>
      </Card>

      {/* Plan overview */}
      <Card>
        <CardHeader
          title="Configuration plan"
          subtitle="Changes the agent will apply to the simulated Salesforce org"
          icon={<div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Layers size={15} /></div>}
          right={
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{totalCount} change{totalCount === 1 ? "" : "s"}</Badge>
              {alreadySimulated && <Badge tone="success">100% applied</Badge>}
            </div>
          }
        />

        {notReady ? (
          <div className="text-[12px] text-slate-500 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            The Salesforce Config Agent has not published a plan yet. Return to the run detail — the plan will appear here as soon as it is ready.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grouped plan cards */}
            <div className="space-y-3">
              <PlanGroup
                title="Permissions to grant"
                icon={<KeyRound size={14} />}
                items={permsToGrant}
                tone="amber"
                emptyLabel="No permission grants needed"
              />
              <PlanGroup
                title="Custom metadata to upsert"
                icon={<Sparkles size={14} />}
                items={metadataToUpsert.map((m) => `${m.type}.${m.developerName}`)}
                tone="violet"
                emptyLabel="No metadata records to change"
              />
              <PlanGroup
                title="Scheduled jobs to activate"
                icon={<Timer size={14} />}
                items={jobsToActivate}
                tone="sky"
                emptyLabel="All required jobs already active"
              />
              <PlanGroup
                title="Page layouts to upgrade"
                icon={<Package size={14} />}
                items={layoutsToUpgrade.map((l) => l.replace("::", " · "))}
                tone="emerald"
                emptyLabel="All page layouts already current"
              />
            </div>

            {/* Simulation log */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                <Play size={11} className="text-indigo-500" /> Simulation progress
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5 max-h-[420px] overflow-auto">
                {appliedSteps.length === 0 && (
                  <div className="text-[11.5px] text-slate-500 py-6 text-center">Plan is empty — nothing to apply.</div>
                )}
                {appliedSteps.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-[12px] transition-all",
                      s.status === "applied"
                        ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    {s.status === "applied" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : upgrade.stage === "salesforce_config" && !alreadySimulated ? (
                      <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate flex-1">{s.label}</span>
                    {s.appliedAt && (
                      <span className="text-[10px] text-slate-500 shrink-0">{formatRelative(s.appliedAt)}</span>
                    )}
                  </div>
                ))}
              </div>
              {totalCount > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Action */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="text-[13.5px] font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" /> Simulate the planned changes
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
              We are not connected to a live Salesforce org. Clicking Simulate Changes runs the plan against the demo&apos;s simulated Salesforce state, animating each mutation in the log above.
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleSimulate}
            disabled={!canSimulate || simulating}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            {alreadySimulated ? (
              <>
                <CheckCircle2 size={15} /> Changes simulated
              </>
            ) : simulating ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Simulating…
              </>
            ) : canSimulate ? (
              <>
                <Zap size={15} /> Simulate Changes
              </>
            ) : blocker ? (
              <>
                <Lock size={15} /> {blocker.label}
              </>
            ) : (
              <>
                <Cloud size={15} /> Waiting for plan…
              </>
            )}
          </Button>
        </div>
      </Card>

      {alreadySimulated && (
        <Card className="bg-emerald-50/60 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-emerald-900">Salesforce configuration simulated</div>
              <div className="text-[11.5px] text-emerald-800 mt-0.5">
                All {totalCount} change{totalCount === 1 ? "" : "s"} were applied to the simulated org at {sim?.simulatedAt ? formatRelative(sim.simulatedAt) : "just now"}. The orchestrator has moved on to the Stripe email step.
              </div>
            </div>
            <Link href={`/upgrades/${upgrade.id}/stripe`}>
              <Button variant="outline">
                Open Stripe screen <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function VersionCell({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "brand";
  small?: boolean;
}) {
  const cls = {
    slate: "bg-slate-100 border-slate-200 text-slate-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    brand: "bg-indigo-50 border-indigo-200 text-indigo-700",
  }[tone];
  return (
    <div className={cn("rounded-2xl border p-4", cls)}>
      <div className="text-[10.5px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className={cn("font-mono font-bold mt-1.5", small ? "text-[13px]" : "text-[20px]")}>{value}</div>
    </div>
  );
}

function PlanGroup({
  title,
  icon,
  items,
  tone,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[] | { type: string; developerName: string; values: Record<string, unknown> }[];
  tone: "amber" | "violet" | "sky" | "emerald";
  emptyLabel: string;
}) {
  const iconCls = {
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[tone];
  const strings = (items as unknown[]).map((i) => (typeof i === "string" ? i : `${(i as { type: string }).type}.${(i as { developerName: string }).developerName}`));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconCls)}>{icon}</div>
        <div className="text-[12.5px] font-semibold text-slate-900">{title}</div>
        <Badge tone="neutral" className="ml-auto">{strings.length}</Badge>
      </div>
      {strings.length === 0 ? (
        <div className="text-[11.5px] text-slate-500 mt-2 pl-9">{emptyLabel}</div>
      ) : (
        <ul className="mt-2 space-y-1 pl-9">
          {strings.map((s, i) => (
            <li key={i} className="text-[11.5px] font-mono text-slate-700 truncate">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
