import { randomUUID } from "node:crypto";
import { inspectReadiness } from "../simulators/salesforce";
import { auditWebhooks } from "../simulators/stripe";
import type { AgentDecision, UpgradeRun } from "../types";
import { emitActivity, evidence, persistDecision, reasonWithStream, think } from "./base";
import { sleep } from "../util";

export async function runReadinessAgent(
  upgrade: UpgradeRun,
  opts: {
    orgId: string;
    stripeAccountId: string;
    targetVersion: string;
    webhookUrl: string;
  },
): Promise<{
  decision: AgentDecision;
  snapshot: Awaited<ReturnType<typeof inspectReadiness>>;
  webhookAudit: Awaited<ReturnType<typeof auditWebhooks>>;
}> {
  const stage = "readiness" as const;
  const agent = "readiness" as const;
  const emit = { agent, stage, upgradeId: upgrade.id };

  await think(emit, "Bootstrapping readiness checks against Salesforce Metadata API…", 250);

  await emitActivity(emit, "tool_call", "Salesforce.inspectReadiness", `Org: ${opts.orgId}, target: v${opts.targetVersion}`, { target: "Salesforce" });
  const snapshot = await inspectReadiness(opts.orgId, opts.targetVersion);
  await emitActivity(emit, "tool_result", "Salesforce readiness snapshot", `${snapshot.outdatedLayouts.length} outdated layouts · ${snapshot.disabledJobs.length} inactive jobs · ${snapshot.missingPermissions.length} missing permissions`, {
    target: "Salesforce",
    payload: snapshot as unknown as Record<string, unknown>,
  });

  await think(emit, "Auditing Stripe webhook endpoint for required event coverage…", 200);
  await emitActivity(emit, "tool_call", "Stripe.auditWebhooks", `Endpoint ${opts.webhookUrl}`, { target: "Stripe" });
  const webhookAudit = await auditWebhooks(opts.stripeAccountId, opts.webhookUrl);
  await emitActivity(emit, "tool_result", "Stripe webhook audit", `${webhookAudit.missingEvents.length} missing event(s): ${webhookAudit.missingEvents.slice(0, 3).join(", ")}${webhookAudit.missingEvents.length > 3 ? "…" : ""}`, {
    target: "Stripe",
    payload: webhookAudit as unknown as Record<string, unknown>,
  });

  await sleep(200);

  const reasoning = await reasonWithStream(emit, {
    agent: "readiness",
    task: "Assess org readiness for Fonteva Payments 3.0",
    context: {
      currentVersion: snapshot.currentVersion,
      targetVersion: opts.targetVersion,
      missingPermissions: snapshot.missingPermissions,
      disabledJobs: snapshot.disabledJobs,
      outdatedLayouts: snapshot.outdatedLayouts,
      missingConnectedApps: snapshot.missingConnectedApps,
      missingWebhookEvents: webhookAudit.missingEvents,
      connectedStripeAccount: snapshot.connectedStripeAccount,
    },
  }, "Reasoning about readiness signals");

  const decision: AgentDecision = {
    id: randomUUID(),
    agent,
    action: "readiness_report",
    summary: reasoning.summary,
    reasoning: reasoning.reasoning,
    confidence: reasoning.confidence,
    evidence: evidence([
      ["Current package version", snapshot.currentVersion, snapshot.currentVersion !== opts.targetVersion],
      ["Target package version", opts.targetVersion, true],
      ["Missing permissions", snapshot.missingPermissions.length, snapshot.missingPermissions.length === 0],
      ["Inactive scheduled jobs", snapshot.disabledJobs.length, snapshot.disabledJobs.length === 0],
      ["Outdated page layouts", snapshot.outdatedLayouts.length, snapshot.outdatedLayouts.length === 0],
      ["Connected Stripe app", snapshot.connectedStripeAccount ? "connected" : "disconnected", !!snapshot.connectedStripeAccount],
      ["Missing Stripe webhook events", webhookAudit.missingEvents.length, webhookAudit.missingEvents.length === 0],
    ]),
    requiresHumanApproval: snapshot.missingPermissions.length > 0,
    createdAt: new Date().toISOString(),
  };
  await persistDecision(decision, upgrade);
  await emitActivity(emit, "decision", "Readiness assessment complete", decision.summary, {
    confidence: decision.confidence,
    payload: { decisionId: decision.id, narrative: reasoning.narrative },
  });
  return { decision, snapshot, webhookAudit };
}
