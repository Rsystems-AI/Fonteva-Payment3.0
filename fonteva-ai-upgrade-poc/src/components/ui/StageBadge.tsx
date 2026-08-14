import { Badge, type Tone } from "./Badge";
import type { UpgradeStage, UpgradeStatus } from "@/lib/types";

const STAGE_LABELS: Record<UpgradeStage, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  readiness: { label: "Readiness Check", tone: "info" },
  planning: { label: "Planning", tone: "info" },
  awaiting_plan_approval: { label: "Awaiting Plan Approval", tone: "warning" },
  salesforce_config: { label: "Configuring Salesforce", tone: "brand" },
  awaiting_salesforce_simulate: { label: "Awaiting Simulate Changes", tone: "warning" },
  stripe_integration: { label: "Drafting Stripe Email", tone: "violet" },
  awaiting_stripe_send: { label: "Awaiting Email Send", tone: "warning" },
  reporting: { label: "Generating Report", tone: "cyan" },
  awaiting_signoff: { label: "Awaiting Sign-off", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  rolled_back: { label: "Rolled Back", tone: "danger" },
};

export function StageBadge({ stage, dot }: { stage: UpgradeStage; dot?: boolean }) {
  const meta = STAGE_LABELS[stage] ?? { label: stage, tone: "neutral" as Tone };
  return <Badge tone={meta.tone} dot={dot}>{meta.label}</Badge>;
}

const STATUS_LABELS: Record<UpgradeStatus, { label: string; tone: Tone }> = {
  in_progress: { label: "In Progress", tone: "brand" },
  waiting_human: { label: "Awaiting Human", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  rolled_back: { label: "Rolled Back", tone: "danger" },
};

export function StatusBadge({ status, dot = true }: { status: UpgradeStatus; dot?: boolean }) {
  const meta = STATUS_LABELS[status];
  return <Badge tone={meta.tone} dot={dot}>{meta.label}</Badge>;
}
