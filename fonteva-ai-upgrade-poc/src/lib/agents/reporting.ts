import { randomUUID } from "node:crypto";
import type { AgentDecision, UpgradeReport, UpgradeRun } from "../types";
import { emitActivity, evidence, persistDecision, reasonWithStream, think } from "./base";

export async function runReportingAgent(
  upgrade: UpgradeRun,
  opts: {
    targetVersion: string;
    layoutsApplied: number;
    jobsActivated: number;
    webhookEventsRequested: number;
    ratesRequested: number;
    stripeEmailSent: boolean;
    stripeEmailRecipient?: string;
    warnings: string[];
    issues: string[];
    startedAtIso: string;
    engineerNotes: string[];
  },
): Promise<{ decision: AgentDecision; report: UpgradeReport }> {
  const stage = "reporting" as const;
  const agent = "reporting" as const;
  const emit = { agent, stage, upgradeId: upgrade.id };

  await think(emit, "Compiling upgrade report from all agent decisions and evidence.");

  const durationMs = Date.now() - new Date(opts.startedAtIso).getTime();
  const minutes = Math.max(1, Math.round(durationMs / 60_000));

  const webhookStatus = opts.stripeEmailSent
    ? `Email request sent to ${opts.stripeEmailRecipient ?? "the Stripe team"} — ${opts.webhookEventsRequested} event(s) requested`
    : `Email drafted for ${opts.stripeEmailRecipient ?? "the Stripe team"} — pending engineer send`;

  const report: UpgradeReport = {
    packageVersion: opts.targetVersion,
    webhookStatus,
    scheduledJobs: `${opts.jobsActivated} job(s) activated`,
    pageLayoutStatus: `${opts.layoutsApplied} layout(s) upgraded`,
    warnings: opts.warnings,
    issuesFound: opts.issues,
    completionTimeMinutes: minutes,
    engineerNotes: opts.engineerNotes,
    generatedBy: "reporting",
    generatedAt: new Date().toISOString(),
  };

  const reasoning = await reasonWithStream(emit, {
    agent: "reporting",
    task: "Produce Payments 3.0 upgrade completion report narrative",
    context: {
      packageVersion: report.packageVersion,
      layoutsApplied: opts.layoutsApplied,
      jobsActivated: opts.jobsActivated,
      webhookEventsRequested: opts.webhookEventsRequested,
      ratesRequested: opts.ratesRequested,
      stripeEmailSent: opts.stripeEmailSent,
      warnings: opts.warnings,
      issues: opts.issues,
      completionTimeMinutes: report.completionTimeMinutes,
    },
  }, "Drafting completion report");

  if (reasoning.narrative) {
    report.engineerNotes = [reasoning.narrative, ...report.engineerNotes];
  }

  const decision: AgentDecision = {
    id: randomUUID(),
    agent,
    action: "upgrade_report",
    summary: `Upgrade report ready — ${report.completionTimeMinutes} min total.`,
    reasoning: reasoning.reasoning,
    confidence: reasoning.confidence,
    evidence: evidence([
      ["Total upgrade minutes", report.completionTimeMinutes, true],
      ["Layouts upgraded", opts.layoutsApplied, true],
      ["Jobs activated", opts.jobsActivated, true],
      ["Stripe events requested", opts.webhookEventsRequested, true],
      ["Stripe email sent", opts.stripeEmailSent, opts.stripeEmailSent],
      ["Warnings", opts.warnings.length, opts.warnings.length === 0],
      ["Issues found", opts.issues.length, opts.issues.length === 0],
    ]),
    requiresHumanApproval: true, // final sign-off
    createdAt: new Date().toISOString(),
  };
  await persistDecision(decision, upgrade);
  await emitActivity(emit, "decision", "Upgrade report ready", decision.summary, { confidence: decision.confidence, payload: { decisionId: decision.id } });
  return { decision, report };
}
