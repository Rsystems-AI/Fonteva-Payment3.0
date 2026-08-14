// Shared type system for the Fonteva Payments 3.0 Upgrade Assistant POC.
// Everything the agents, simulators, and UI persist/exchange flows through these types.

export type AgentId =
  | "orchestrator"
  | "readiness"
  | "salesforce_config"
  | "stripe_integration"
  | "reporting"
  | "governance";

export interface AgentDescriptor {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  icon: string;
  responsibilities: string[];
}

export type UpgradeStage =
  | "queued"
  | "readiness"
  | "planning"
  | "awaiting_plan_approval"
  | "salesforce_config"
  | "awaiting_salesforce_simulate"
  | "stripe_integration"
  | "awaiting_stripe_send"
  | "reporting"
  | "awaiting_signoff"
  | "completed"
  | "failed"
  | "rolled_back";

export type UpgradeStatus = "in_progress" | "waiting_human" | "completed" | "failed" | "rolled_back";

export interface OrgAccount {
  id: string;
  name: string;
  region: "NA" | "EU" | "APAC" | "LATAM";
  segment: "SMB" | "MidMarket" | "Enterprise";
  currentPackageVersion: string;
  targetPackageVersion: string;
  contact: { name: string; email: string; title: string };
  stripeAccountId: string;
  members: number;
  annualPaymentVolumeUsd: number;
  tags: string[];
}

export interface SalesforceOrgState {
  orgId: string;
  packageVersion: string;
  permissions: {
    fonteva_admin: boolean;
    payments_api: boolean;
    metadata_deploy: boolean;
  };
  scheduledJobs: Array<{ name: string; cron: string; active: boolean; class: string }>;
  pageLayouts: Array<{ object: string; layout: string; version: number; upgraded: boolean }>;
  customMetadata: Array<{ type: string; developerName: string; values: Record<string, string | number | boolean> }>;
  permissionSets: Array<{ name: string; assigned: number }>;
  connectedApps: Array<{ name: string; provider: "stripe" | "twilio" | "docusign"; status: "connected" | "expired" | "disconnected" }>;
}

export interface StripeAccountState {
  accountId: string;
  displayName: string;
  livemode: boolean;
  webhooks: Array<{ id: string; url: string; events: string[]; status: "enabled" | "disabled" }>;
  rates: Array<{ currency: string; percent: number; fixedCents: number }>;
  payouts: Array<{ id: string; amountCents: number; currency: string; status: "paid" | "pending" | "failed"; createdAt: string }>;
}

export interface UpgradeScenario {
  id: string;
  title: string;
  summary: string;
  orgId: string;
  seed: {
    // Overrides applied to the base Salesforce org state to create realistic starting conditions.
    packageVersionOverride?: string;
    missingPermissions?: string[];
    disableJobs?: string[];
    outdatedLayouts?: string[];
    missingConnectedApps?: string[];
    stripeMissingWebhookEvents?: string[];
    stripeMissingRates?: string[];
  };
  expectedOutcome: "clean_upgrade" | "requires_hitl_config_change" | "requires_hitl_email";
}

export interface DecisionEvidence {
  label: string;
  value: string | number | boolean;
  ok: boolean;
}

export interface AgentDecision {
  id: string;
  agent: AgentId;
  action: string;
  summary: string;
  reasoning: string[];
  confidence: number; // 0..1
  evidence: DecisionEvidence[];
  requiresHumanApproval: boolean;
  suggestedBy?: AgentId;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  upgradeId: string;
  agent: AgentId;
  stage: UpgradeStage;
  title: string;
  question: string;
  options: Array<{ id: string; label: string; description: string; recommended?: boolean; risk?: "low" | "medium" | "high" }>;
  decisionId: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  chosenOptionId?: string;
  reviewerNote?: string;
  status: "pending" | "approved" | "rejected" | "changed";
}

export interface AgentActivity {
  id: string;
  upgradeId: string;
  agent: AgentId;
  stage: UpgradeStage;
  kind:
    | "thought"
    | "action"
    | "tool_call"
    | "tool_result"
    | "decision"
    | "handoff"
    | "notice"
    | "hitl_request"
    | "hitl_resolved"
    | "reasoning_stream"
    | "reasoning_complete"
    | "narrative_stream";
  title: string;
  detail?: string;
  target?: string;
  confidence?: number;
  durationMs?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface UpgradeReport {
  packageVersion: string;
  webhookStatus: string;
  scheduledJobs: string;
  pageLayoutStatus: string;
  warnings: string[];
  issuesFound: string[];
  completionTimeMinutes: number;
  engineerNotes: string[];
  generatedBy: AgentId;
  generatedAt: string;
}

// The Salesforce agent posts a plan the engineer reviews on the dedicated
// Salesforce page. Simulating the plan applies each change and marks this true.
export interface SalesforceSimulation {
  planId: string;
  simulated: boolean;
  simulatedAt?: string;
  layoutsToUpgrade: string[];
  jobsToActivate: string[];
  permsToGrant: string[];
  metadataToUpsert: Array<{ type: string; developerName: string; values: Record<string, string | number | boolean> }>;
  appliedSteps: Array<{ label: string; status: "pending" | "applied"; appliedAt?: string }>;
}

// The Stripe agent drafts an email to the Stripe team. The engineer reviews it
// on the dedicated Stripe page and clicks "Send" to mark it as sent.
export interface StripeEmailDraft {
  id: string;
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  requestedEvents: string[];
  requestedRates: Array<{ currency: string; percent: number; fixedCents: number }>;
  webhookUrl: string;
  sent: boolean;
  sentAt?: string;
  sentBy?: string;
}

export interface UpgradeRun {
  id: string;
  orgId: string;
  scenarioId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stage: UpgradeStage;
  status: UpgradeStatus;
  progress: number; // 0..100
  currentAgent?: AgentId;
  approvalQueue: string[]; // pending approval ids
  decisions: string[]; // decision ids
  salesforceSimulation?: SalesforceSimulation;
  stripeEmail?: StripeEmailDraft;
  report?: UpgradeReport;
  estimatedMinutesSaved?: number;
  humanOverrides: number;
  autoActions: number;
  riskFlags: string[];
  overrides?: {
    targetVersion?: string;
    freshSimulatedState?: boolean;
  };
}

export interface AuditEntry {
  id: string;
  ts: string;
  upgradeId?: string;
  actor: "system" | "agent" | "human";
  agent?: AgentId;
  human?: string;
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
  hash: string; // Chain hash for tamper evidence.
  prevHash: string;
}

export interface KpiSnapshot {
  totalUpgrades: number;
  completed: number;
  inProgress: number;
  awaitingHuman: number;
  failed: number;
  avgMinutes: number;
  savedHours: number;
  autoActionRate: number;
  hitlDecisions: number;
}
