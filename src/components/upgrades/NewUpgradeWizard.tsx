"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  DollarSign,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Rocket,
  CheckCircle2,
  Loader2,
  Package,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { cn } from "@/lib/util";
import type { OrgAccount, UpgradeScenario } from "@/lib/types";

// Available Payments 3.x target versions the customer org can be upgraded to.
// These are the same values the internal team publishes on their release notes.
const VERSION_PRESETS: Array<{ value: string; label: string; description: string; recommended?: boolean }> = [
  { value: "3.02", label: "v3.02", description: "Current GA release. Recommended for all customer orgs.", recommended: true },
  { value: "3.03", label: "v3.03", description: "Latest patch. Includes webhook signature hardening." },
  { value: "3.10", label: "v3.10", description: "Preview release. Multi-currency payout improvements." },
];

export function NewUpgradeWizard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgAccount[]>([]);
  const [scenarios, setScenarios] = useState<UpgradeScenario[]>([]);
  const [step, setStep] = useState<0 | 1>(0);
  const [orgId, setOrgId] = useState<string>("");
  const [targetVersion, setTargetVersion] = useState<string>("3.02");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((j: { orgs: OrgAccount[]; scenarios: UpgradeScenario[] }) => {
        setOrgs(j.orgs);
        setScenarios(j.scenarios);
        if (j.orgs.length && !orgId) {
          setOrgId(j.orgs[0].id);
          setTargetVersion(j.orgs[0].targetPackageVersion);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const org = useMemo(() => orgs.find((o) => o.id === orgId), [orgs, orgId]);

  // Pick a starting scenario automatically based on the selected org. If the
  // catalog has a scenario authored specifically for this org, use it (that's
  // the most realistic starting state). Otherwise fall back to any clean-upgrade
  // scenario, and finally to the first scenario in the catalog.
  const autoScenario = useMemo<UpgradeScenario | undefined>(() => {
    if (!org) return undefined;
    return (
      scenarios.find((s) => s.orgId === org.id) ??
      scenarios.find((s) => s.expectedOutcome === "clean_upgrade") ??
      scenarios[0]
    );
  }, [org, scenarios]);

  const start = async () => {
    if (!org || !autoScenario) return;
    setLoading(true);
    try {
      const r = await fetch("/api/upgrades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId: org.id,
          scenarioId: autoScenario.id,
          createdBy: "jordan.miller@rsystems.example.com",
          overrides: {
            targetVersion,
            freshSimulatedState: true,
          },
        }),
      });
      const j = (await r.json()) as { upgrade?: { id: string }; error?: unknown };
      if (r.ok && j.upgrade?.id) {
        showToast({
          type: "success",
          title: "Upgrade launched",
          message: `${org.name} → v${targetVersion}. Streaming live agents.`,
        });
        router.push(`/upgrades/${j.upgrade.id}`);
      } else {
        showToast({ type: "error", title: "Launch failed", message: JSON.stringify(j.error ?? {}) });
        setLoading(false);
      }
    } catch (e) {
      showToast({ type: "error", title: "Launch failed", message: e instanceof Error ? e.message : String(e) });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Stepper step={step} />

      {step === 0 && (
        <Card>
          <div className="mb-4">
            <div className="text-[15px] font-semibold text-slate-900">Choose the customer org</div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              Pick any organization from the demo catalog. Enterprise-grade synthetic data.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orgs.map((o) => {
              const active = orgId === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    setOrgId(o.id);
                    setTargetVersion(o.targetPackageVersion);
                  }}
                  className={cn(
                    "text-left p-4 rounded-2xl border-2 transition-all",
                    active ? "border-indigo-500 bg-indigo-50/40 shadow-lift" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                      o.segment === "Enterprise" ? "bg-indigo-100 text-indigo-700" :
                      o.segment === "MidMarket" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700",
                    )}>
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-slate-900 truncate">{o.name}</div>
                      <div className="text-[11.5px] text-slate-500 truncate">{o.contact.name} · {o.contact.title}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="chip"><MapPin size={10} />{o.region}</span>
                        <span className="chip">{o.segment}</span>
                        <span className="chip"><Users size={10} />{o.members.toLocaleString()}</span>
                        <span className="chip"><DollarSign size={10} />${(o.annualPaymentVolumeUsd / 1_000_000).toFixed(1)}M/yr</span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Package size={11} className="text-slate-400" />
                        v{o.currentPackageVersion} → <span className="font-mono font-semibold text-indigo-700">v{o.targetPackageVersion}</span>
                      </div>
                    </div>
                    {active && (
                      <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!orgId}>
              Next: pick target version <ArrowRight size={15} />
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && org && (
        <Card>
          <div className="mb-4">
            <div className="text-[15px] font-semibold text-slate-900">Pick a target version</div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              Choose which Payments 3.x release the customer org should be upgraded to. The AI agents will handle the rest.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {VERSION_PRESETS.map((v) => {
              const active = targetVersion === v.value;
              return (
                <button
                  key={v.value}
                  onClick={() => setTargetVersion(v.value)}
                  className={cn(
                    "text-left p-4 rounded-2xl border-2 transition-all relative",
                    active ? "border-indigo-500 bg-indigo-50/40 shadow-lift" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center",
                        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700",
                      )}>
                        <Package size={16} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-slate-900 font-mono">{v.label}</div>
                        {v.recommended && (
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mt-0.5">
                            Recommended
                          </div>
                        )}
                      </div>
                    </div>
                    {active && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                  </div>
                  <div className="text-[11.5px] text-slate-600 mt-3 leading-relaxed">{v.description}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <ReviewCell label="Customer org" value={org.name} sub={`${org.contact.name} · ${org.segment}`} />
            <ReviewCell label="Current version" value={`v${org.currentPackageVersion}`} sub="Detected in Salesforce metadata" />
            <ReviewCell label="Target version" value={`v${targetVersion}`} sub="AI will upgrade to this release" />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-start gap-2.5">
              <Info size={14} className="text-slate-500 mt-0.5" />
              <div className="text-[12px] text-slate-600 leading-relaxed">
                Clicking <span className="font-semibold text-slate-900">Launch</span> creates a new upgrade run and immediately begins streaming the multi-agent pipeline. The AI will inspect readiness, plan the Salesforce configuration for you to simulate, draft an email to the Stripe team, and generate a signed-off report — with GPT-4o Mini reasoning visible at each step.
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)} disabled={loading}>
              <ArrowLeft size={15} /> Back
            </Button>
            <Button size="lg" onClick={start} disabled={loading || !autoScenario}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {loading ? "Launching…" : `Launch upgrade to v${targetVersion}`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Customer", "Target version"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={l} className="flex items-center gap-2">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
              done ? "bg-emerald-500 text-white" :
              active ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
              "bg-white border border-slate-200 text-slate-500",
            )}>
              {done ? <CheckCircle2 size={13} /> : i + 1}
            </div>
            <div className={cn("text-[12px] font-medium", active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400")}>
              {l}
            </div>
            {i < labels.length - 1 && (
              <div className={cn("h-px w-8", done ? "bg-emerald-400" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewCell({ label, value, sub }: { label: string; value?: string | null; sub?: string | null }) {
  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-[13px] font-semibold text-slate-900 mt-1 truncate">{value ?? "—"}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sub}</div>}
    </div>
  );
}
