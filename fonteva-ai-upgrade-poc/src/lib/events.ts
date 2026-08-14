// In-process pub/sub event bus. Used by:
//   - agents to broadcast activity
//   - SSE routes to stream to browsers
// Also persists a compact activity feed in the DB for replay after refresh.

import { EventEmitter } from "node:events";
import { db } from "./db";
import type { AgentActivity } from "./types";

class GlobalBus extends EventEmitter {}

// Node reuses module instances during dev; put on globalThis to survive HMR.
declare global {
  // eslint-disable-next-line no-var
  var __fontevaBus: GlobalBus | undefined;
}

export const bus: GlobalBus = globalThis.__fontevaBus ?? new GlobalBus();
bus.setMaxListeners(256);
if (!globalThis.__fontevaBus) globalThis.__fontevaBus = bus;

export interface StreamDelta {
  upgradeId: string;
  agent: string;
  stage: string;
  streamId: string; // client uses this to group deltas into one block
  kind: "reasoning" | "narrative";
  text: string; // delta only
  done?: boolean;
}

export type BusEvent =
  | { type: "activity"; activity: AgentActivity }
  | { type: "upgrade_updated"; upgradeId: string }
  | { type: "approval_created"; approvalId: string; upgradeId: string }
  | { type: "approval_resolved"; approvalId: string; upgradeId: string }
  | { type: "stream_delta"; delta: StreamDelta };

export function emit(ev: BusEvent) {
  bus.emit("event", ev);
  if (ev.type === "activity") bus.emit("activity", ev.activity);
}

export function subscribe(handler: (ev: BusEvent) => void): () => void {
  bus.on("event", handler);
  return () => bus.off("event", handler);
}

export async function logActivity(activity: AgentActivity): Promise<void> {
  await db.activities.append(activity);
  emit({ type: "activity", activity });
}

export function emitStreamDelta(d: StreamDelta) {
  emit({ type: "stream_delta", delta: d });
}
