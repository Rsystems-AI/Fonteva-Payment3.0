// The Orchestrator agent runs the full state machine, calling specialists,
// applying governance, requesting HITL approvals, and streaming activity.
//
// Flow:
//   queued
//   → readiness
//   → planning (SF plan + Stripe email drafted)
//   → awaiting_plan_approval (HITL: approve plan)
//   → salesforce_config → awaiting_salesforce_simulate (HITL: click Simulate Changes)
//   → stripe_integration → awaiting_stripe_send (HITL: click Send Email)
//   → reporting
//   → awaiting_signoff (HITL: sign off)
//   → completed

import { randomUUID } from "node:crypto";
import { db } from "../db";
import {
  applyScenarioSeed,
  applyScenarioStripeSeed,
  orgById,
  scenarioById,
  seedSalesforceState,
  seedStripeState,
} from "../seed";
import {
  ensureOrg,
  loadOrg,
  setPackageVersion,
} from "../simulators/salesforce";
import { ensureAccount, loadAccount, saveAccount } from "../simulators/stripe";
import type { AgentId, UpgradeRun, UpgradeStage } from "../types";
import { sleep } from "../util";
import { createApproval, emitActivity, updateUpgrade, waitForApproval } from "./base";
import { evaluate } from "./governance";
import { runReadinessAgent } from "./readiness";
import { applySalesforcePlan, persistSalesforceSimulation, planSalesforceConfig } from "./salesforce_config";
import { draftStripeEmail } from "./stripe_integration";
import { runReportingAgent } from "./reporting";

const STAGE_PROGRESS: Record<UpgradeStage, number> = {
  queued: 2,
  readiness: 10,
  planning: 22,
  awaiting_plan_approval: 30,
  salesforce_config: 50,
  awaiting_salesforce_simulate: 55,
  stripe_integration: 72,
  awaiting_stripe_send: 78,
  reporting: 90,
  awaiting_signoff: 96,
  completed: 100,
  failed: 100,
  rolled_back: 100,
};

const HITL_STAGES: UpgradeStage[] = [
  "awaiting_plan_approval",
  "awaiting_salesforce_simulate",
  "awaiting_stripe_send",
  "awaiting_signoff",
];

async function setStage(upgrade: UpgradeRun, stage: UpgradeStage, agent?: AgentId) {
  await updateUpgrade(upgrade, {
    stage,
    progress: STAGE_PROGRESS[stage] ?? upgrade.progress,
    currentAgent: agent ?? upgrade.currentAgent,
    status: HITL_STAGES.includes(stage) ? "waiting_human" : upgrade.status,
  });
}

export interface StartUpgradeInput {
  orgId: string;
  scenarioId: string;
  createdBy: string;
  overrides?: {
    targetVersion?: string;
    freshSimulatedState?: boolean;
  };
}

export async function startUpgrade(input: StartUpgradeInput): Promise<UpgradeRun> {
  const org = { ...(orgById(input.orgId) ?? (() => { throw new Error("Unknown org"); })()) };
  const scenario = JSON.parse(JSON.stringify(scenarioById(input.scenarioId))) as ReturnType<typeof scenarioById>;
  if (!scenario) throw new Error("Unknown scenario");

  if (input.overrides?.targetVersion) org.targetPackageVersion = input.overrides.targetVersion;

  const baseSf = seedSalesforceState(org);
  const seededSf = applyScenarioSeed(baseSf, scenario);
  if (input.overrides?.freshSimulatedState) {
    const mod = await import("../simulators/salesforce");
    await mod.saveOrg(seededSf);
  } else {
    await ensureOrg(seededSf);
    const loadedSf = await loadOrg(org.id);
    if (loadedSf) {
      const mod = await import("../simulators/salesforce");
      await mod.saveOrg(seededSf);
    }
  }

  const baseStripe = seedStripeState(org);
  const seededStripe = applyScenarioStripeSeed(baseStripe, scenario);
  if (input.overrides?.freshSimulatedState) {
    await saveAccount(seededStripe);
  } else {
    await ensureAccount(seededStripe);
    const loadedStripe = await loadAccount(org.stripeAccountId);
    if (loadedStripe) await saveAccount(seededStripe);
  }

  const upgrade: UpgradeRun = {
    id: randomUUID(),
    orgId: org.id,
    scenarioId: scenario.id,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: "queued",
    status: "in_progress",
    progress: STAGE_PROGRESS.queued,
    approvalQueue: [],
    decisions: [],
    autoActions: 0,
    humanOverrides: 0,
    riskFlags: [],
    overrides: {
      targetVersion: input.overrides?.targetVersion ?? org.targetPackageVersion,
      freshSimulatedState: input.overrides?.freshSimulatedState,
    },
  };
  await db.upgrades.upsert(upgrade);

  await emitActivity(
    { agent: "orchestrator", stage: "queued", upgradeId: upgrade.id },
    "notice",
    "Upgrade run created",
    `${org.name} → v${org.targetPackageVersion} (scenario: ${scenario.title})`,
    { payload: { orgId: org.id, scenarioId: scenario.id } },
  );

  void runOrchestration(upgrade.id).catch(async (err) => {
    console.error("orchestration failed", err);
    const u = await db.upgrades.findById(upgrade.id);
    if (u) {
      await updateUpgrade(u, { stage: "failed", status: "failed", progress: 100 });
      await emitActivity(
        { agent: "orchestrator", stage: "failed", upgradeId: u.id },
        "notice",
        "Orchestration failed",
        String(err instanceof Error ? err.message : err),
      );
    }
  });

  return upgrade;
}

async function runOrchestration(upgradeId: string): Promise<void> {
  const upgrade = await db.upgrades.findById(upgradeId);
  if (!upgrade) throw new Error(`Upgrade not found: ${upgradeId}`);
  const org = orgById(upgrade.orgId);
  const scenario = scenarioById(upgrade.scenarioId);
  if (!org || !scenario) throw new Error("Unknown org/scenario");

  const webhookUrl = `https://payments.fonteva.example/${org.id}/webhook`;
  const targetVersion = upgrade.overrides?.targetVersion ?? org.targetPackageVersion;

  // ---------- Stage: readiness ----------
  await setStage(upgrade, "readiness", "readiness");
  const { decision: readinessDecision, snapshot, webhookAudit } = await runReadinessAgent(upgrade, {
    orgId: org.id,
    stripeAccountId: org.stripeAccountId,
    targetVersion,
    webhookUrl,
  });

  const readinessVerdict = evaluate(readinessDecision);
  if (readinessDecision.confidence < 0.7 || snapshot.missingConnectedApps.length > 0) {
    await emitActivity(
      { agent: "governance", stage: "readiness", upgradeId: upgrade.id },
      "notice",
      "Governance halted upgrade",
      readinessVerdict.reasons.join(" • ") || "Readiness insufficient",
      { confidence: readinessDecision.confidence },
    );
    await updateUpgrade(upgrade, { stage: "failed", status: "failed", progress: 100, riskFlags: [...upgrade.riskFlags, "readiness_fail"] });
    return;
  }

  // ---------- Stage: planning (SF plan + Stripe email drafted) ----------
  await setStage(upgrade, "planning", "salesforce_config");
  const { decision: sfPlanDecision, plan: sfPlan } = await planSalesforceConfig(upgrade, {
    orgId: org.id,
    outdatedLayouts: snapshot.outdatedLayouts,
    disabledJobs: snapshot.disabledJobs,
    missingPermissions: snapshot.missingPermissions,
    targetVersion,
  });
  const sfVerdict = evaluate(sfPlanDecision);

  await emitActivity(
    { agent: "stripe_integration", stage: "planning", upgradeId: upgrade.id },
    "handoff",
    "Orchestrator → Stripe Integration Agent",
    "Requesting Stripe email draft.",
    { payload: {} },
  );
  const { decision: stripeEmailDecision } = await draftStripeEmail(upgrade, {
    stripeAccountId: org.stripeAccountId,
    webhookUrl,
    missingEvents: webhookAudit.missingEvents,
    orgId: org.id,
    orgName: org.name,
    contactName: org.contact.name,
    contactEmail: org.contact.email,
    targetVersion,
  });
  const stripeVerdict = evaluate(stripeEmailDecision);

  // Persist the plan-snapshot into the upgrade so the SF page can render.
  await persistSalesforceSimulation(upgrade, sfPlan);

  // ---------- HITL: plan approval ----------
  if (sfVerdict.requiresApproval || stripeVerdict.requiresApproval) {
    await setStage(upgrade, "awaiting_plan_approval", "governance");
    const approval = await createApproval(upgrade, "governance", "awaiting_plan_approval", {
      title: "Approve upgrade plan",
      question: [
        `The AI has proposed a Salesforce configuration plan and drafted an email for the Stripe team.`,
        `Salesforce: ${sfPlan.layoutsToUpgrade.length} layout(s), ${sfPlan.jobsToActivate.length} job(s), ${sfPlan.permsToGrant.length} permission(s), ${sfPlan.metadataToUpsert.length} metadata record(s).`,
        `Stripe email: drafted for the Stripe team (send is a separate confirmation step).`,
        sfVerdict.reasons.concat(stripeVerdict.reasons).join(" • ") || "",
      ].join(" "),
      options: [
        { id: "approve_all", label: "Approve full plan", description: "Continue to the Salesforce simulate step and the Stripe email review.", recommended: true, risk: sfVerdict.riskLevel },
        { id: "reject", label: "Reject plan", description: "Halt upgrade.", risk: "high" },
      ],
      decision: sfPlanDecision,
    });
    const resolved = await waitForApproval(approval.id);
    upgrade.humanOverrides += 1;

    if (resolved.status === "rejected" || resolved.chosenOptionId === "reject") {
      await emitActivity({ agent: "orchestrator", stage: "failed", upgradeId: upgrade.id }, "notice", "Plan rejected by engineer", resolved.reviewerNote);
      await updateUpgrade(upgrade, { stage: "failed", status: "failed", progress: 100 });
      return;
    }
  } else {
    upgrade.autoActions += 1;
  }

  // ---------- Stage: Salesforce configuration + HITL "Simulate Changes" ----------
  await setStage(upgrade, "salesforce_config", "salesforce_config");
  await emitActivity(
    { agent: "salesforce_config", stage: "salesforce_config", upgradeId: upgrade.id },
    "notice",
    "Salesforce plan ready for simulate-apply",
    "Open the Salesforce screen and click Simulate Changes to apply the planned configuration.",
  );

  await setStage(upgrade, "awaiting_salesforce_simulate", "salesforce_config");
  const simulateApproval = await createApproval(upgrade, "salesforce_config", "awaiting_salesforce_simulate", {
    title: "Simulate Salesforce configuration changes",
    question: "Review the planned Salesforce changes and click Simulate Changes to apply them to the simulated org.",
    options: [
      { id: "simulate", label: "Simulate changes", description: "Apply the planned changes to the simulated Salesforce org.", recommended: true, risk: "low" },
      { id: "abort", label: "Abort upgrade", description: "Do not apply the Salesforce changes.", risk: "high" },
    ],
    decision: sfPlanDecision,
  });
  const simResolved = await waitForApproval(simulateApproval.id);
  upgrade.humanOverrides += 1;

  if (simResolved.chosenOptionId === "abort") {
    await emitActivity({ agent: "orchestrator", stage: "failed", upgradeId: upgrade.id }, "notice", "Salesforce simulate aborted by engineer", simResolved.reviewerNote);
    await updateUpgrade(upgrade, { stage: "failed", status: "failed", progress: 100 });
    return;
  }

  await setStage(upgrade, "salesforce_config", "salesforce_config");
  await applySalesforcePlan(upgrade, org.id, sfPlan);
  await setPackageVersion(org.id, targetVersion);

  // ---------- Stage: Stripe integration + HITL "Send email" ----------
  await setStage(upgrade, "stripe_integration", "stripe_integration");
  await emitActivity(
    { agent: "stripe_integration", stage: "stripe_integration", upgradeId: upgrade.id },
    "notice",
    "Stripe email ready for review",
    "Open the Stripe screen to review the drafted email and click Send to deliver it to the Stripe team.",
  );

  await setStage(upgrade, "awaiting_stripe_send", "stripe_integration");
  const sendApproval = await createApproval(upgrade, "stripe_integration", "awaiting_stripe_send", {
    title: "Send email to Stripe team",
    question: "Review the drafted email requesting webhook + rate configuration, then click Send Email.",
    options: [
      { id: "send", label: "Send email", description: "Deliver the drafted email to the Stripe team.", recommended: true, risk: "low" },
      { id: "abort", label: "Do not send", description: "Continue without sending the email (report will note it as pending).", risk: "medium" },
    ],
    decision: stripeEmailDecision,
  });
  const sendResolved = await waitForApproval(sendApproval.id);
  upgrade.humanOverrides += 1;

  // Reload upgrade so we pick up the stripeEmail state (sent flag) if the
  // "Send" API route flipped it while we were waiting.
  const refreshedForStripe = await db.upgrades.findById(upgrade.id);
  if (refreshedForStripe) upgrade.stripeEmail = refreshedForStripe.stripeEmail;

  const warnings: string[] = [];
  if (sendResolved.chosenOptionId === "abort" || !upgrade.stripeEmail?.sent) {
    warnings.push("Stripe email was not sent — the Stripe team has not yet been notified. Reopen the Stripe screen to send it later.");
  }

  // ---------- Stage: reporting ----------
  await setStage(upgrade, "reporting", "reporting");
  const { decision: reportDecision, report } = await runReportingAgent(upgrade, {
    targetVersion,
    layoutsApplied: sfPlan.layoutsToUpgrade.length,
    jobsActivated: sfPlan.jobsToActivate.length,
    webhookEventsRequested: upgrade.stripeEmail?.requestedEvents.length ?? 0,
    ratesRequested: upgrade.stripeEmail?.requestedRates.length ?? 0,
    stripeEmailSent: upgrade.stripeEmail?.sent ?? false,
    stripeEmailRecipient: upgrade.stripeEmail?.to,
    warnings,
    issues: [],
    startedAtIso: upgrade.createdAt,
    engineerNotes: [],
  });

  await updateUpgrade(upgrade, { report });

  // ---------- HITL: sign-off ----------
  await setStage(upgrade, "awaiting_signoff", "reporting");
  const signoff = await createApproval(upgrade, "reporting", "awaiting_signoff", {
    title: "Sign off on upgrade",
    question: "Review the AI-generated report and confirm the upgrade can be closed.",
    options: [
      { id: "signoff", label: "Sign off & notify customer", description: "Close upgrade, mark customer-communicated.", recommended: true, risk: "low" },
      { id: "signoff_note", label: "Sign off with engineer note", description: "Adds an engineer note to the report.", risk: "low" },
      { id: "reject", label: "Reject — needs more work", description: "Return to engineer.", risk: "medium" },
    ],
    decision: reportDecision,
  });
  const resolved = await waitForApproval(signoff.id);
  upgrade.humanOverrides += 1;

  if (resolved.chosenOptionId === "reject") {
    await emitActivity({ agent: "orchestrator", stage: "failed", upgradeId: upgrade.id }, "notice", "Sign-off rejected", resolved.reviewerNote);
    await updateUpgrade(upgrade, { stage: "failed", status: "failed", progress: 100 });
    return;
  }
  if (resolved.reviewerNote) {
    report.engineerNotes.push(resolved.reviewerNote);
    await updateUpgrade(upgrade, { report });
  }

  const totalMinutes = Math.max(1, Math.round((Date.now() - new Date(upgrade.createdAt).getTime()) / 60_000));
  const savedMinutes = Math.max(0, 60 * 24 * 2 - totalMinutes);
  await updateUpgrade(upgrade, {
    stage: "completed",
    status: "completed",
    progress: 100,
    estimatedMinutesSaved: savedMinutes,
  });
  await emitActivity({ agent: "orchestrator", stage: "completed", upgradeId: upgrade.id }, "notice", "Upgrade complete", `Total minutes: ${totalMinutes}`);
  await sleep(50);
}
