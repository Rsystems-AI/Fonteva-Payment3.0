// Shared helpers used by all specialist agents.

import { randomUUID } from "node:crypto";
import { db } from "../db";
import { emitStreamDelta, logActivity } from "../events";
import { record as audit } from "../audit";
import { getLLM, type ReasoningRequest, type ReasoningResponse } from "../llm";
import type {
  AgentActivity,
  AgentDecision,
  AgentId,
  ApprovalRequest,
  DecisionEvidence,
  UpgradeRun,
  UpgradeStage,
} from "../types";
import { sleep } from "../util";

export interface AgentContext {
  upgrade: UpgradeRun;
  orgId: string;
  stripeAccountId: string;
  targetVersion: string;
  scenarioSeed: UpgradeRun extends { scenarioId: infer S } ? S : string;
}

export interface EmitOpts {
  agent: AgentId;
  stage: UpgradeStage;
  upgradeId: string;
}

export async function emitActivity(
  opts: EmitOpts,
  kind: AgentActivity["kind"],
  title: string,
  detail?: string,
  extra: Partial<AgentActivity> = {},
): Promise<AgentActivity> {
  const activity: AgentActivity = {
    id: randomUUID(),
    upgradeId: opts.upgradeId,
    agent: opts.agent,
    stage: opts.stage,
    kind,
    title,
    detail,
    createdAt: new Date().toISOString(),
    ...extra,
  };
  await logActivity(activity);
  if (kind !== "thought") {
    await audit({
      upgradeId: activity.upgradeId,
      actor: "agent",
      agent: activity.agent,
      action: `${kind}:${title}`,
      target: activity.target,
      after: activity.payload,
    });
  }
  return activity;
}

export async function persistDecision(d: AgentDecision, upgrade: UpgradeRun) {
  await db.decisions.upsert(d);
  if (!upgrade.decisions.includes(d.id)) upgrade.decisions.push(d.id);
  upgrade.updatedAt = new Date().toISOString();
  await db.upgrades.upsert(upgrade);
}

export async function createApproval(
  upgrade: UpgradeRun,
  agent: AgentId,
  stage: UpgradeStage,
  input: {
    title: string;
    question: string;
    options: ApprovalRequest["options"];
    decision: AgentDecision;
  },
): Promise<ApprovalRequest> {
  const approval: ApprovalRequest = {
    id: randomUUID(),
    upgradeId: upgrade.id,
    agent,
    stage,
    title: input.title,
    question: input.question,
    options: input.options,
    decisionId: input.decision.id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await db.approvals.upsert(approval);
  upgrade.approvalQueue.push(approval.id);
  upgrade.status = "waiting_human";
  upgrade.updatedAt = new Date().toISOString();
  await db.upgrades.upsert(upgrade);
  await emitActivity(
    { agent, stage, upgradeId: upgrade.id },
    "hitl_request",
    input.title,
    input.question,
    { payload: { approvalId: approval.id, options: input.options } },
  );
  return approval;
}

export async function waitForApproval(approvalId: string, pollMs = 400): Promise<ApprovalRequest> {
  while (true) {
    const a = await db.approvals.findById(approvalId);
    if (a && a.status !== "pending") return a;
    await sleep(pollMs);
  }
}

export function evidence(rows: Array<[string, string | number | boolean, boolean]>): DecisionEvidence[] {
  return rows.map(([label, value, ok]) => ({ label, value, ok }));
}

export async function think(
  opts: EmitOpts,
  text: string,
  ms = 300 + Math.random() * 250,
): Promise<void> {
  await emitActivity(opts, "thought", text);
  await sleep(ms);
}

export async function updateUpgrade(u: UpgradeRun, patch: Partial<UpgradeRun>) {
  Object.assign(u, patch, { updatedAt: new Date().toISOString() });
  await db.upgrades.upsert(u);
}

// Runs the LLM in streaming mode and emits token deltas over the event bus.
// The client subscribes via /api/stream and groups deltas by streamId.
// Also logs a `reasoning_complete` activity at the end so the reasoning
// persists after refresh.
export async function reasonWithStream(
  opts: EmitOpts,
  req: ReasoningRequest,
  streamTitle: string,
): Promise<ReasoningResponse> {
  const llm = getLLM();
  const streamId = randomUUID();

  await emitActivity(opts, "reasoning_stream", streamTitle, undefined, {
    payload: { streamId, provider: llm.info().provider, model: llm.info().model },
  });

  const emit = (kind: "reasoning" | "narrative", text: string) => {
    emitStreamDelta({
      upgradeId: opts.upgradeId,
      agent: opts.agent,
      stage: opts.stage,
      streamId,
      kind,
      text,
    });
  };

  let result: ReasoningResponse;
  try {
    if (llm.streamReason) {
      result = await llm.streamReason(req, (c) => {
        if (c.kind === "reasoning" || c.kind === "narrative") emit(c.kind, c.text);
      });
    } else {
      result = await llm.reason(req);
      for (const r of result.reasoning) emit("reasoning", r + "\n");
      if (result.narrative) emit("narrative", result.narrative);
    }
  } catch (err) {
    // Fallback: log the error and fall back to mock reasoning so demo never breaks.
    console.error("LLM streaming failed, falling back:", err);
    result = await llm.reason(req).catch(() => ({
      summary: "Reasoning unavailable — LLM error, using heuristic.",
      reasoning: ["LLM call failed; agent used deterministic evidence."],
      confidence: 0.7,
    }));
  }

  // Signal end of the stream so the client stops the caret animation.
  emitStreamDelta({
    upgradeId: opts.upgradeId,
    agent: opts.agent,
    stage: opts.stage,
    streamId,
    kind: "reasoning",
    text: "",
    done: true,
  });

  await emitActivity(opts, "reasoning_complete", streamTitle, result.summary, {
    confidence: result.confidence,
    payload: {
      streamId,
      reasoning: result.reasoning,
      narrative: result.narrative,
      chosenOptionId: result.chosenOptionId,
    },
  });

  return result;
}
