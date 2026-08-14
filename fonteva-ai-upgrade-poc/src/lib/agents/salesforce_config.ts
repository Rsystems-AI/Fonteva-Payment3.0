import { randomUUID } from "node:crypto";
import {
  activateScheduledJobs,
  grantPermissions,
  upgradePageLayouts,
  upsertCustomMetadata,
} from "../simulators/salesforce";
import type { AgentDecision, SalesforceSimulation, UpgradeRun } from "../types";
import { sleep } from "../util";
import { emitActivity, evidence, persistDecision, reasonWithStream, think, updateUpgrade } from "./base";

export interface SalesforcePlan {
  layoutsToUpgrade: string[];
  jobsToActivate: string[];
  permsToGrant: string[];
  metadataToUpsert: Array<{ type: string; developerName: string; values: Record<string, string | number | boolean> }>;
}

export async function planSalesforceConfig(
  upgrade: UpgradeRun,
  opts: {
    orgId: string;
    outdatedLayouts: string[];
    disabledJobs: string[];
    missingPermissions: string[];
    targetVersion: string;
  },
): Promise<{ decision: AgentDecision; plan: SalesforcePlan }> {
  const stage = "planning" as const;
  const agent = "salesforce_config" as const;
  const emit = { agent, stage, upgradeId: upgrade.id };

  await think(emit, "Building a minimal, reversible Salesforce configuration plan…", 220);

  const plan: SalesforcePlan = {
    layoutsToUpgrade: opts.outdatedLayouts,
    jobsToActivate: opts.disabledJobs,
    permsToGrant: opts.missingPermissions,
    metadataToUpsert: [
      {
        type: "PaymentsSettings__mdt",
        developerName: "PaymentsV3",
        values: {
          Enabled: true,
          WebhookRelayJob: "FontevaStripeWebhookRelay",
          TargetVersion: opts.targetVersion,
          RolloutTimestamp: new Date().toISOString(),
        },
      },
    ],
  };

  const reasoning = await reasonWithStream(emit, {
    agent: "salesforce_config",
    task: "Plan Salesforce upgrade configuration",
    context: {
      layoutsToUpgrade: plan.layoutsToUpgrade,
      jobsToActivate: plan.jobsToActivate,
      permsToGrant: plan.permsToGrant,
      metadataToUpsert: plan.metadataToUpsert.map((m) => `${m.type}.${m.developerName}`),
    },
  }, "Drafting Salesforce configuration plan");

  const decision: AgentDecision = {
    id: randomUUID(),
    agent,
    action: "salesforce_plan",
    summary: reasoning.summary || `Plan generated: ${plan.layoutsToUpgrade.length} layouts, ${plan.jobsToActivate.length} jobs, ${plan.permsToGrant.length} permissions.`,
    reasoning: reasoning.reasoning,
    confidence: reasoning.confidence,
    evidence: evidence([
      ["Page layouts to upgrade", plan.layoutsToUpgrade.length, plan.layoutsToUpgrade.length >= 0],
      ["Scheduled jobs to activate", plan.jobsToActivate.length, plan.jobsToActivate.length >= 0],
      ["Permissions to grant", plan.permsToGrant.length, plan.permsToGrant.length >= 0],
      ["Custom metadata records", plan.metadataToUpsert.length, true],
    ]),
    requiresHumanApproval: plan.permsToGrant.length > 0,
    createdAt: new Date().toISOString(),
  };
  await persistDecision(decision, upgrade);
  await emitActivity(emit, "decision", "Salesforce config plan proposed", decision.summary, {
    confidence: decision.confidence,
    payload: { decisionId: decision.id, plan, narrative: reasoning.narrative },
  });
  return { decision, plan };
}

// Persist the plan into the upgrade record so the Salesforce page can render
// the "simulated" changes and let the engineer click "Simulate Changes".
export async function persistSalesforceSimulation(upgrade: UpgradeRun, plan: SalesforcePlan): Promise<SalesforceSimulation> {
  const appliedSteps: SalesforceSimulation["appliedSteps"] = [];
  for (const p of plan.permsToGrant) appliedSteps.push({ label: `Grant permission: ${p}`, status: "pending" });
  for (const m of plan.metadataToUpsert) appliedSteps.push({ label: `Upsert custom metadata: ${m.type}.${m.developerName}`, status: "pending" });
  for (const j of plan.jobsToActivate) appliedSteps.push({ label: `Activate scheduled job: ${j}`, status: "pending" });
  for (const l of plan.layoutsToUpgrade) appliedSteps.push({ label: `Upgrade page layout: ${l.replace("::", " · ")}`, status: "pending" });

  const sim: SalesforceSimulation = {
    planId: randomUUID(),
    simulated: false,
    layoutsToUpgrade: plan.layoutsToUpgrade,
    jobsToActivate: plan.jobsToActivate,
    permsToGrant: plan.permsToGrant,
    metadataToUpsert: plan.metadataToUpsert,
    appliedSteps,
  };
  await updateUpgrade(upgrade, { salesforceSimulation: sim });
  return sim;
}

// Actually apply the plan against the simulated Salesforce. Called when the
// engineer clicks "Simulate Changes" on the Salesforce page.
export async function applySalesforcePlan(upgrade: UpgradeRun, orgId: string, plan: SalesforcePlan): Promise<SalesforceSimulation> {
  const stage = "salesforce_config" as const;
  const agent = "salesforce_config" as const;
  const emit = { agent, stage, upgradeId: upgrade.id };

  await think(emit, "Executing plan in dependency order: perms → metadata → jobs → layouts.", 200);

  // Freshly compute the applied-steps list so the UI can animate progress.
  const sim = upgrade.salesforceSimulation ?? (await persistSalesforceSimulation(upgrade, plan));
  const stepMap = new Map<string, number>();
  sim.appliedSteps.forEach((s, i) => stepMap.set(s.label, i));

  const markApplied = async (label: string) => {
    const idx = stepMap.get(label);
    if (idx === undefined) return;
    sim.appliedSteps[idx] = { label, status: "applied", appliedAt: new Date().toISOString() };
    await updateUpgrade(upgrade, { salesforceSimulation: { ...sim } });
  };

  if (plan.permsToGrant.length) {
    await emitActivity(emit, "tool_call", "Salesforce.grantPermissions", plan.permsToGrant.join(", "), { target: "Salesforce" });
    const r = await grantPermissions(orgId, plan.permsToGrant);
    await emitActivity(emit, "tool_result", `Permissions granted (${r.granted.length})`, r.granted.join(", ") || "no-op", { target: "Salesforce", payload: r as unknown as Record<string, unknown> });
    for (const p of plan.permsToGrant) await markApplied(`Grant permission: ${p}`);
    await sleep(140);
  }

  if (plan.metadataToUpsert.length) {
    await emitActivity(emit, "tool_call", "Salesforce.upsertCustomMetadata", plan.metadataToUpsert.map((m) => `${m.type}.${m.developerName}`).join(", "), { target: "Salesforce" });
    const r = await upsertCustomMetadata(orgId, plan.metadataToUpsert);
    await emitActivity(emit, "tool_result", `Custom metadata upserted (${r.upserted.length})`, r.upserted.join(", "), { target: "Salesforce", payload: r as unknown as Record<string, unknown> });
    for (const m of plan.metadataToUpsert) await markApplied(`Upsert custom metadata: ${m.type}.${m.developerName}`);
    await sleep(140);
  }

  if (plan.jobsToActivate.length) {
    await emitActivity(emit, "tool_call", "Salesforce.activateScheduledJobs", plan.jobsToActivate.join(", "), { target: "Salesforce" });
    const r = await activateScheduledJobs(orgId, plan.jobsToActivate);
    await emitActivity(emit, "tool_result", `Scheduled jobs activated (${r.activated.length})`, r.activated.join(", ") || "no-op", { target: "Salesforce", payload: r as unknown as Record<string, unknown> });
    for (const j of plan.jobsToActivate) await markApplied(`Activate scheduled job: ${j}`);
    await sleep(140);
  }

  if (plan.layoutsToUpgrade.length) {
    await emitActivity(emit, "tool_call", "Salesforce.upgradePageLayouts", `${plan.layoutsToUpgrade.length} layout(s)`, { target: "Salesforce" });
    const r = await upgradePageLayouts(orgId, plan.layoutsToUpgrade);
    await emitActivity(emit, "tool_result", `Page layouts upgraded (${r.upgraded.length})`, r.upgraded.join(", "), { target: "Salesforce", payload: r as unknown as Record<string, unknown> });
    for (const l of plan.layoutsToUpgrade) await markApplied(`Upgrade page layout: ${l.replace("::", " · ")}`);
  }

  sim.simulated = true;
  sim.simulatedAt = new Date().toISOString();
  await updateUpgrade(upgrade, { salesforceSimulation: { ...sim } });

  await emitActivity(emit, "notice", "Salesforce configuration applied", "All planned mutations committed to the simulated org.", { target: "Salesforce" });
  return sim;
}
