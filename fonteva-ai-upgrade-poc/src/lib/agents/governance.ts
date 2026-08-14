// Cross-cutting governance policies used by the orchestrator.

import type { AgentDecision } from "../types";

export interface GovernancePolicy {
  minConfidenceForAutoApply: number;
  maxHighRiskAutoActions: number;
  requireApprovalForPermissionGrants: boolean;
  requireFinalHumanSignoff: boolean;
}

export const DEFAULT_POLICY: GovernancePolicy = {
  minConfidenceForAutoApply: 0.85,
  maxHighRiskAutoActions: 0,
  requireApprovalForPermissionGrants: true,
  requireFinalHumanSignoff: true,
};

export interface GovernanceVerdict {
  requiresApproval: boolean;
  reasons: string[];
  riskLevel: "low" | "medium" | "high";
}

export function evaluate(decision: AgentDecision, policy: GovernancePolicy = DEFAULT_POLICY): GovernanceVerdict {
  const reasons: string[] = [];
  let requiresApproval = decision.requiresHumanApproval;

  if (decision.confidence < policy.minConfidenceForAutoApply) {
    reasons.push(`Confidence ${(decision.confidence * 100).toFixed(0)}% below threshold ${(policy.minConfidenceForAutoApply * 100).toFixed(0)}%`);
    requiresApproval = true;
  }

  if (decision.action === "salesforce_plan" && policy.requireApprovalForPermissionGrants) {
    const permsRow = decision.evidence.find((e) => e.label === "Permissions to grant");
    if (permsRow && typeof permsRow.value === "number" && permsRow.value > 0) {
      reasons.push("Permission grants require human approval (policy).");
      requiresApproval = true;
    }
  }

  if (decision.action === "stripe_email_draft") {
    reasons.push("Stripe email must be reviewed and sent by an engineer (policy).");
    requiresApproval = true;
  }

  if (decision.action === "upgrade_report" && policy.requireFinalHumanSignoff) {
    reasons.push("Final report requires engineer sign-off (policy).");
    requiresApproval = true;
  }

  const risk =
    decision.confidence < 0.7 || (decision.evidence.some((e) => !e.ok) && decision.action !== "readiness_report")
      ? "high"
      : decision.confidence < 0.85
      ? "medium"
      : "low";

  return { requiresApproval, reasons, riskLevel: risk };
}
