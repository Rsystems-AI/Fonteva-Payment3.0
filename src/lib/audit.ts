// Tamper-evident audit log. Each entry hashes (prevHash + payload) so any
// mutation of an earlier row breaks the chain — useful for governance demos.

import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import type { AgentActivity, AuditEntry } from "./types";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

// State must live on globalThis so that Next.js dev-mode module isolation
// (each route can get its own module context) doesn't create parallel chains.
declare global {
  // eslint-disable-next-line no-var
  var __fontevaAuditState: { cachedTail: AuditEntry | null | undefined; chainLock: Promise<void> } | undefined;
}
const auditState =
  globalThis.__fontevaAuditState ??
  (globalThis.__fontevaAuditState = { cachedTail: undefined, chainLock: Promise.resolve() });

async function tail(): Promise<AuditEntry | null> {
  if (auditState.cachedTail !== undefined) return auditState.cachedTail;
  const all = await db.audit.all();
  auditState.cachedTail = all.length ? all[all.length - 1] : null;
  return auditState.cachedTail;
}

export async function record(entry: Omit<AuditEntry, "id" | "ts" | "hash" | "prevHash">): Promise<AuditEntry> {
  const prev = auditState.chainLock;
  let release!: () => void;
  auditState.chainLock = new Promise<void>((r) => (release = r));
  try {
    await prev;
    const last = await tail();
    const prevHash = last?.hash ?? "GENESIS";
    const full: AuditEntry = {
      ...entry,
      id: randomUUID(),
      ts: new Date().toISOString(),
      prevHash,
      hash: "",
    };
    const payload = JSON.stringify({
      prev: prevHash,
      body: {
        actor: full.actor,
        agent: full.agent ?? null,
        human: full.human ?? null,
        action: full.action,
        target: full.target ?? null,
        before: full.before ?? null,
        after: full.after ?? null,
        upgradeId: full.upgradeId ?? null,
        ts: full.ts,
      },
    });
    full.hash = sha256(payload);
    await db.audit.append(full);
    auditState.cachedTail = full;
    return full;
  } finally {
    release();
  }
}

export async function verifyChain(): Promise<{ ok: boolean; brokenAt?: string }> {
  const all = await db.audit.all();
  let prevHash = "GENESIS";
  for (const entry of all) {
    const payload = JSON.stringify({
      prev: prevHash,
      body: {
        actor: entry.actor,
        agent: entry.agent ?? null,
        human: entry.human ?? null,
        action: entry.action,
        target: entry.target ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        upgradeId: entry.upgradeId ?? null,
        ts: entry.ts,
      },
    });
    const expected = sha256(payload);
    if (expected !== entry.hash) return { ok: false, brokenAt: entry.id };
    prevHash = entry.hash;
  }
  return { ok: true };
}

export async function auditFromActivity(activity: AgentActivity) {
  if (activity.kind === "thought") return;
  await record({
    upgradeId: activity.upgradeId,
    actor: "agent",
    agent: activity.agent,
    action: activity.kind + ":" + activity.title,
    target: activity.target,
    after: activity.payload,
  });
}
