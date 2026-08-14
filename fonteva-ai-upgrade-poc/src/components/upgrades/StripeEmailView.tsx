"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useEventStream } from "@/lib/hooks/useEventStream";
import type { OrgAccount, UpgradeRun } from "@/lib/types";
import { cn, formatRelative } from "@/lib/util";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  AtSign,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  Lock,
  Mail,
  Paperclip,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";

export function StripeEmailView({ upgrade: initial, org }: { upgrade: UpgradeRun; org: OrgAccount }) {
  const [upgrade, setUpgrade] = useState(initial);
  const [sending, setSending] = useState(false);

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

  const email = upgrade.stripeEmail;
  const canSend = upgrade.stage === "awaiting_stripe_send" && email && !email.sent;
  const alreadySent = !!email?.sent;
  const notReady = !email;

  // Reasons the Send button might be disabled *other* than "no draft yet".
  // Order matches the orchestrator's HITL gates, so the earliest blocker wins.
  const blocker: { label: string; hint: string; href?: string; icon: typeof Lock } | null = (() => {
    if (alreadySent || canSend || notReady) return null;
    if (upgrade.stage === "awaiting_plan_approval") {
      return {
        label: "Waiting for plan approval",
        hint: "The plan (Salesforce + Stripe email) must be approved by an engineer before this email can be sent. Head to the run detail and approve the plan.",
        href: `/upgrades/${upgrade.id}`,
        icon: UserCheck,
      };
    }
    if (upgrade.stage === "salesforce_config" || upgrade.stage === "awaiting_salesforce_simulate") {
      return {
        label: "Waiting for Salesforce simulate",
        hint: "The Salesforce configuration changes must be simulated before this email is enabled. Open the Salesforce screen and click Simulate Changes.",
        href: `/upgrades/${upgrade.id}/salesforce`,
        icon: Settings2,
      };
    }
    if (["reporting", "awaiting_signoff", "completed", "failed", "rolled_back"].includes(upgrade.stage)) {
      return {
        label: "Email step already passed",
        hint: "The workflow has moved beyond the Stripe email step. Reopen the run to see the current state.",
        href: `/upgrades/${upgrade.id}`,
        icon: AlertTriangle,
      };
    }
    return {
      label: "Not yet at the send step",
      hint: `Current stage: ${upgrade.stage}. The Send button unlocks when the run reaches the Stripe send stage.`,
      href: `/upgrades/${upgrade.id}`,
      icon: Lock,
    };
  })();

  const handleSend = async () => {
    setSending(true);
    try {
      const r = await fetch(`/api/upgrades/${upgrade.id}/stripe/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolvedBy: "engineer" }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        showToast({ type: "error", title: "Send failed", message: j.error || "unknown_error" });
      } else {
        showToast({
          type: "success",
          title: "Email successfully sent to the Stripe team",
          message: `Delivered to ${email?.to ?? "the Stripe team"}.`,
        });
      }
    } catch (e) {
      showToast({ type: "error", title: "Send failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setTimeout(() => setSending(false), 1200);
      void refetch();
    }
  };

  const handleCopy = () => {
    if (!email) return;
    void navigator.clipboard.writeText(`Subject: ${email.subject}\nTo: ${email.to}\n\n${email.body}`);
    showToast({ type: "info", title: "Email copied to clipboard" });
  };

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
            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Mail size={17} />
            </div>
            <div>
              <div className="text-[18px] font-bold text-slate-900">Stripe Integration Agent</div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {org.name} · Draft email to the Stripe team · No direct API access
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alreadySent ? (
            <Badge tone="success" dot>Sent</Badge>
          ) : canSend ? (
            <Badge tone="warning" dot>Awaiting Send</Badge>
          ) : notReady ? (
            <Badge tone="neutral">Draft not ready</Badge>
          ) : blocker ? (
            <Badge tone="warning" dot>{blocker.label}</Badge>
          ) : (
            <Badge tone="brand" dot>In review</Badge>
          )}
        </div>
      </div>

      {/* Explanation banner */}
      <Card className="bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="text-[12px] text-slate-700 leading-relaxed">
            We do not currently have direct Stripe API access. Instead of touching Stripe itself, the Stripe Integration Agent has drafted a fully-populated email to the Stripe team requesting the required webhook and rate configuration. Review the draft below and click <span className="font-semibold text-slate-900">Send Email</span> to deliver it.
          </div>
        </div>
      </Card>

      {/* Blocker banner — shown when the draft is ready but the run hasn't reached the send gate yet. */}
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

      {notReady ? (
        <Card>
          <div className="text-[12px] text-slate-500 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            The agent has not finished drafting the email yet. Return to the run detail — the draft will appear here as soon as it is ready.
          </div>
        </Card>
      ) : (
        <>
          {/* Email metadata */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetaField label="From" value={org.contact.email} icon={<User size={12} />} />
              <MetaField label="To" value={email!.to} icon={<AtSign size={12} />} highlight />
              <MetaField label="Cc" value={(email!.cc ?? []).join(", ") || "—"} icon={<AtSign size={12} />} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Subject</div>
              <div className="text-[14px] font-semibold text-slate-900">{email!.subject}</div>
            </div>
          </Card>

          {/* Email body preview */}
          <Card>
            <CardHeader
              title="Drafted email body"
              subtitle="AI-generated. Fully populated with webhook + rate details."
              icon={<div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><Sparkles size={14} /></div>}
              right={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy size={12} /> Copy
                  </Button>
                  <Badge tone="neutral">{email!.body.split("\n").length} lines</Badge>
                </div>
              }
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 font-mono text-[12.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
              {email!.body}
            </div>

            {(email!.requestedEvents.length > 0 || email!.requestedRates.length > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <Paperclip size={11} />
                <span>Attached configuration:</span>
                {email!.requestedEvents.length > 0 && (
                  <Badge tone="violet">{email!.requestedEvents.length} webhook event(s)</Badge>
                )}
                {email!.requestedRates.length > 0 && (
                  <Badge tone="violet">{email!.requestedRates.length} rate row(s)</Badge>
                )}
              </div>
            )}
          </Card>

          {/* Action */}
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="text-[13.5px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-violet-600" /> Send email to Stripe team
                </div>
                <div className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                  Clicking Send Email delivers this draft to <span className="font-mono">{email!.to}</span>. The audit trail records the send with timestamp and reviewer.
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleSend}
                disabled={!canSend || sending}
                className={cn("!bg-violet-600 hover:!bg-violet-700", alreadySent && "!bg-emerald-600 hover:!bg-emerald-700")}
              >
                {alreadySent ? (
                  <>
                    <CheckCircle2 size={15} /> Email sent
                  </>
                ) : sending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Sending…
                  </>
                ) : canSend ? (
                  <>
                    <Send size={15} /> Send Email
                  </>
                ) : blocker ? (
                  <>
                    <Lock size={15} /> {blocker.label}
                  </>
                ) : (
                  <>
                    <Send size={15} /> Waiting for draft…
                  </>
                )}
              </Button>
            </div>
          </Card>

          {alreadySent && (
            <Card className="bg-emerald-50/60 border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold text-emerald-900">Email successfully sent to the Stripe team</div>
                  <div className="text-[11.5px] text-emerald-800 mt-0.5">
                    Delivered to {email!.to} {email!.sentAt ? `· ${formatRelative(email!.sentAt)}` : ""}
                    {email!.sentBy ? ` · by ${email!.sentBy}` : ""}.
                    The orchestrator has moved on to reporting.
                  </div>
                </div>
                <Link href={`/upgrades/${upgrade.id}`}>
                  <Button variant="outline">
                    Back to run <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetaField({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-3.5",
      highlight ? "border-violet-200 bg-violet-50/50" : "border-slate-200 bg-white",
    )}>
      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className={cn("text-[13px] font-mono mt-1.5 truncate", highlight ? "text-violet-800 font-semibold" : "text-slate-900")}>
        {value || "—"}
      </div>
    </div>
  );
}
