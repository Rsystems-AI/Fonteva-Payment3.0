import type { AgentDescriptor, AgentId } from "../types";

export const AGENTS: Record<AgentId, AgentDescriptor> = {
  orchestrator: {
    id: "orchestrator",
    name: "Upgrade Orchestrator",
    role: "Supervisor",
    color: "brand",
    icon: "Network",
    responsibilities: [
      "Routes work between specialist agents",
      "Owns overall upgrade state machine",
      "Escalates to HITL when confidence < threshold",
      "Emits progress + handoff events",
    ],
  },
  readiness: {
    id: "readiness",
    name: "Readiness Analyst",
    role: "Specialist",
    color: "sky",
    icon: "ClipboardCheck",
    responsibilities: [
      "Inspects Salesforce org for prerequisites",
      "Verifies package version, permissions, jobs, connected apps",
      "Produces a readiness report with confidence scoring",
      "Flags missing prerequisites for HITL review",
    ],
  },
  salesforce_config: {
    id: "salesforce_config",
    name: "Salesforce Config Agent",
    role: "Specialist",
    color: "emerald",
    icon: "Settings2",
    responsibilities: [
      "Configures Charge & Payout page layouts",
      "Enables required fields",
      "Activates scheduled jobs",
      "Updates custom metadata & permission sets",
    ],
  },
  stripe_integration: {
    id: "stripe_integration",
    name: "Stripe Integration Agent",
    role: "Specialist",
    color: "violet",
    icon: "Plug",
    responsibilities: [
      "Drafts an email to the Stripe team with the required integration details",
      "Populates webhook events, endpoint URL, and rate table automatically",
      "Waits for engineer to review and send the email",
    ],
  },
  reporting: {
    id: "reporting",
    name: "Reporting Agent",
    role: "Specialist",
    color: "rose",
    icon: "FileText",
    responsibilities: [
      "Synthesizes upgrade summary and evidence",
      "Highlights warnings, exceptions, engineer notes",
      "Produces exec-ready upgrade completion report",
    ],
  },
  governance: {
    id: "governance",
    name: "Governance Guard",
    role: "Oversight",
    color: "cyan",
    icon: "ShieldCheck",
    responsibilities: [
      "Enforces policy on high-risk actions",
      "Watches for confidence < threshold and requests HITL",
      "Owns final sign-off authority",
    ],
  },
};

export const AGENT_LIST: AgentDescriptor[] = Object.values(AGENTS);

export function agent(id: AgentId): AgentDescriptor {
  return AGENTS[id];
}
