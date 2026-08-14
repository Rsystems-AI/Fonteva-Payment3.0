import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ORGS } from "@/lib/seed";
import { db } from "@/lib/db";
import { loadOrg } from "@/lib/simulators/salesforce";
import { loadAccount } from "@/lib/simulators/stripe";
import { Cloud, CreditCard, Server, Mail, Building2, Layers, Calendar, KeyRound, Webhook, DollarSign, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const salesforce = await Promise.all(ORGS.map(async (o) => ({ org: o, state: await loadOrg(o.id) })));
  const stripe = await Promise.all(ORGS.map(async (o) => ({ org: o, state: await loadAccount(o.stripeAccountId) })));
  const upgrades = await db.upgrades.all();
  const stripeEmails = upgrades
    .filter((u) => !!u.stripeEmail)
    .map((u) => ({ upgrade: u, email: u.stripeEmail! }))
    .sort((a, b) => (a.upgrade.createdAt < b.upgrade.createdAt ? 1 : -1));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <Card>
        <CardHeader
          title="Simulated Salesforce orgs"
          subtitle="Each org has realistic Fonteva metadata that mutates as agents apply configuration."
          icon={<div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Cloud size={16} /></div>}
          right={<Badge tone="brand">Salesforce Metadata API</Badge>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {salesforce.map(({ org, state }) => {
            const upgradedLayouts = state?.pageLayouts.filter((l) => l.upgraded).length ?? 0;
            const totalLayouts = state?.pageLayouts.length ?? 0;
            const activeJobs = state?.scheduledJobs.filter((j) => j.active).length ?? 0;
            const totalJobs = state?.scheduledJobs.length ?? 0;
            return (
              <div key={org.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-center gap-2 flex-wrap">
                  <Server size={14} className="text-indigo-600" />
                  <div className="text-[13.5px] font-bold text-slate-900">{org.name}</div>
                  <Badge tone="brand">v{state?.packageVersion ?? "—"}</Badge>
                </div>
                <div className="mt-3 space-y-2.5">
                  <MetricRow icon={<Layers size={12} />} label="Page layouts" value={`${upgradedLayouts}/${totalLayouts} upgraded`} pct={totalLayouts ? upgradedLayouts / totalLayouts : 0} />
                  <MetricRow icon={<Calendar size={12} />} label="Scheduled jobs" value={`${activeJobs}/${totalJobs} active`} pct={totalJobs ? activeJobs / totalJobs : 0} />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                      <KeyRound size={10} /> Permissions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <PermChip label="Admin" on={state?.permissions.fonteva_admin} />
                      <PermChip label="Payments API" on={state?.permissions.payments_api} />
                      <PermChip label="Metadata Deploy" on={state?.permissions.metadata_deploy} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Connected apps</div>
                    <div className="flex flex-wrap gap-1">
                      {state?.connectedApps.map((a) => (
                        <span key={a.provider} className={`chip ${a.status === "connected" ? "!text-emerald-700 !border-emerald-200 !bg-emerald-50" : "!text-rose-700 !border-rose-200 !bg-rose-50"}`}>
                          {a.name}: {a.status}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Simulated Stripe accounts"
          subtitle="Webhooks and rates that agents inspect, audit, and reconcile."
          icon={<div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><CreditCard size={16} /></div>}
          right={<Badge tone="violet">Stripe API</Badge>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {stripe.map(({ org, state }) => (
            <div key={org.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2 flex-wrap">
                <CreditCard size={14} className="text-violet-600" />
                <div className="text-[13.5px] font-bold text-slate-900">{org.name}</div>
                <Badge tone="violet">{state?.livemode ? "live" : "test"}</Badge>
              </div>
              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                    <Webhook size={10} /> Webhooks
                  </div>
                  {state?.webhooks.length ? state.webhooks.map((w) => (
                    <div key={w.id} className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-[11px] font-mono text-slate-900 truncate">{w.url}</div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">{w.events.length} event(s) subscribed</div>
                    </div>
                  )) : <div className="text-[11px] text-slate-500">No webhooks configured</div>}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                    <DollarSign size={10} /> Rates
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {state?.rates.map((r) => (
                      <span key={r.currency} className="chip !text-[10.5px]">
                        {r.currency}: {r.percent}% + {r.fixedCents}c
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Recent payouts</div>
                  <div className="space-y-0.5">
                    {state?.payouts.slice(0, 3).map((p) => (
                      <div key={p.id} className="text-[10.5px] font-mono text-slate-600">
                        ${(p.amountCents / 100).toLocaleString()} {p.currency} · {p.status}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Stripe email outbox"
          subtitle="Every Stripe configuration request drafted by the agent. We don't have direct API access, so all changes go via email."
          icon={<div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><Mail size={16} /></div>}
          right={<Badge tone={stripeEmails.length ? "violet" : "neutral"}>{stripeEmails.length} email(s)</Badge>}
        />
        <div className="space-y-2">
          {stripeEmails.map(({ upgrade, email }) => {
            const org = ORGS.find((o) => o.id === upgrade.orgId);
            return (
              <div key={email.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
                <div className="flex items-start gap-3 flex-wrap">
                  <Badge tone={email.sent ? "success" : "warning"} dot>
                    {email.sent ? "sent" : "drafted"}
                  </Badge>
                  <div className="text-[12.5px] font-mono font-semibold text-slate-900">{email.id}</div>
                  {org && (
                    <div className="text-[11.5px] text-slate-600 inline-flex items-center gap-1">
                      <Building2 size={11} /> {org.name}
                    </div>
                  )}
                  {email.sent && email.sentAt && (
                    <div className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={11} /> {new Date(email.sentAt).toLocaleString()}
                    </div>
                  )}
                  <div className="ml-auto text-[11px] text-slate-500 tabular-nums">To: {email.to}</div>
                </div>
                <div className="mt-2 text-[12px] font-semibold text-slate-900">{email.subject}</div>
                <pre className="mt-2 text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-auto">{email.body}</pre>
              </div>
            );
          })}
          {stripeEmails.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              <Mail size={28} className="mx-auto text-slate-300 mb-2" />
              <div className="text-[12.5px] text-slate-500">No Stripe emails yet — launch an upgrade to see one drafted here.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function MetricRow({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const color = clamped >= 0.9 ? "bg-emerald-500" : clamped >= 0.5 ? "bg-indigo-500" : "bg-amber-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
          {icon} {label}
        </div>
        <div className="text-[11px] font-mono text-slate-900">{value}</div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}

function PermChip({ label, on }: { label: string; on?: boolean }) {
  return (
    <span className={`chip ${on ? "!text-emerald-700 !border-emerald-200 !bg-emerald-50" : "!text-rose-700 !border-rose-200 !bg-rose-50"}`}>
      {label}: {on ? "on" : "off"}
    </span>
  );
}
