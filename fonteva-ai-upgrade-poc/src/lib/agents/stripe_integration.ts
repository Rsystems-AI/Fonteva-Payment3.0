import { randomUUID } from "node:crypto";
import type { AgentDecision, StripeEmailDraft, UpgradeRun } from "../types";
import { sleep } from "../util";
import { emitActivity, evidence, persistDecision, reasonWithStream, think, updateUpgrade } from "./base";

// The current organizational reality: we do NOT have direct Stripe API access.
// The Stripe team owns the tenant, so every configuration change must be
// requested via email. This agent's job is therefore to draft that email
// completely and hand it to the engineer to review and send.

const TARGET_RATES = [
  { currency: "USD", percent: 2.9, fixedCents: 30 },
  { currency: "EUR", percent: 2.5, fixedCents: 25 },
  { currency: "GBP", percent: 2.6, fixedCents: 25 },
];

const STRIPE_TEAM_EMAIL = "stripe-team@fonteva.example.com";

export interface StripeEmailPlan {
  webhookUrl: string;
  webhookEvents: string[];
  rates: typeof TARGET_RATES;
}

export async function draftStripeEmail(
  upgrade: UpgradeRun,
  opts: {
    stripeAccountId: string;
    webhookUrl: string;
    missingEvents: string[];
    orgId: string;
    orgName: string;
    contactName: string;
    contactEmail: string;
    targetVersion: string;
  },
): Promise<{ decision: AgentDecision; plan: StripeEmailPlan; email: StripeEmailDraft }> {
  const stage = "stripe_integration" as const;
  const agent = "stripe_integration" as const;
  const emit = { agent, stage, upgradeId: upgrade.id };

  await think(emit, "Composing Stripe configuration request email for the Stripe team.", 260);

  const plan: StripeEmailPlan = {
    webhookUrl: opts.webhookUrl,
    webhookEvents: opts.missingEvents,
    rates: TARGET_RATES,
  };

  const reasoning = await reasonWithStream(emit, {
    agent: "stripe_integration",
    task: "Draft an email to the Stripe team requesting webhook + rate configuration",
    context: {
      stripeAccountId: opts.stripeAccountId,
      webhookUrl: opts.webhookUrl,
      missingWebhookEvents: opts.missingEvents,
      rateCount: TARGET_RATES.length,
      orgName: opts.orgName,
      targetVersion: opts.targetVersion,
    },
  }, "Drafting Stripe request email");

  const subject = `[Fonteva Payments ${opts.targetVersion}] Stripe configuration request — ${opts.orgName}`;
  const bodyLines = [
    `Hi Stripe Team,`,
    ``,
    `As part of the Fonteva Payments ${opts.targetVersion} upgrade for ${opts.orgName}, please configure the following on Stripe account ${opts.stripeAccountId}.`,
    ``,
    `1) Webhook endpoint`,
    `   URL: ${opts.webhookUrl}`,
    `   Add the following events:`,
    ...(opts.missingEvents.length > 0
      ? opts.missingEvents.map((e) => `     - ${e}`)
      : [`     (No new events required — endpoint already fully covered.)`]),
    ``,
    `2) Rate configuration`,
    ...TARGET_RATES.map((r) => `   - ${r.currency}: ${r.percent}% + ${r.fixedCents}¢`),
    ``,
    `Requested by: ${opts.contactName} <${opts.contactEmail}>`,
    `Org ID: ${opts.orgId}`,
    ``,
    `Please confirm once the configuration is complete so we can close out the upgrade.`,
    ``,
    `Thanks,`,
    `Fonteva AI Upgrade Assistant`,
  ];

  const email: StripeEmailDraft = {
    id: `email_${randomUUID().slice(0, 8)}`,
    to: STRIPE_TEAM_EMAIL,
    cc: [opts.contactEmail],
    subject,
    body: bodyLines.join("\n"),
    requestedEvents: opts.missingEvents,
    requestedRates: TARGET_RATES,
    webhookUrl: opts.webhookUrl,
    sent: false,
  };

  await updateUpgrade(upgrade, { stripeEmail: email });

  const decision: AgentDecision = {
    id: randomUUID(),
    agent,
    action: "stripe_email_draft",
    summary: reasoning.summary || `Drafted email to Stripe team for ${opts.orgName} — ${opts.missingEvents.length} event(s), ${TARGET_RATES.length} rate(s).`,
    reasoning: reasoning.reasoning,
    confidence: reasoning.confidence,
    evidence: evidence([
      ["Recipient", email.to, true],
      ["Missing webhook events", opts.missingEvents.length, opts.missingEvents.length === 0],
      ["Rate rows requested", TARGET_RATES.length, true],
      ["Webhook URL", opts.webhookUrl, true],
    ]),
    requiresHumanApproval: true, // engineer must click Send
    createdAt: new Date().toISOString(),
  };
  await persistDecision(decision, upgrade);
  await emitActivity(emit, "decision", "Stripe email drafted", decision.summary, {
    confidence: decision.confidence,
    payload: { decisionId: decision.id, emailId: email.id, narrative: reasoning.narrative },
  });

  await sleep(120);
  return { decision, plan, email };
}

// Marks the drafted email as sent. Called from the Stripe page when the
// engineer clicks "Send Email".
export async function markStripeEmailSent(
  upgrade: UpgradeRun,
  sentBy: string,
): Promise<StripeEmailDraft | null> {
  if (!upgrade.stripeEmail) return null;
  const stage = upgrade.stage;
  const emit = { agent: "stripe_integration" as const, stage, upgradeId: upgrade.id };
  const email: StripeEmailDraft = {
    ...upgrade.stripeEmail,
    sent: true,
    sentAt: new Date().toISOString(),
    sentBy,
  };
  await updateUpgrade(upgrade, { stripeEmail: email });
  await emitActivity(emit, "notice", "Stripe email sent", `Email delivered to ${email.to} by ${sentBy}.`, {
    target: "Stripe",
    payload: { emailId: email.id, to: email.to, sentAt: email.sentAt },
  });
  return email;
}
