// POST /api/upgrades/[id]/salesforce/simulate
//
// The Salesforce screen calls this when the engineer clicks "Simulate Changes".
// It resolves the currently-pending `awaiting_salesforce_simulate` approval,
// which unblocks the orchestrator to actually apply the plan against the
// simulated Salesforce org. The orchestrator itself is what mutates state and
// updates SalesforceSimulation.appliedSteps as each change is applied.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { record as audit } from "@/lib/audit";
import { emit as busEmit } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const upgrade = await db.upgrades.findById(params.id);
  if (!upgrade) return NextResponse.json({ error: "upgrade_not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { resolvedBy?: string; note?: string };
  const resolvedBy = body.resolvedBy || "engineer";

  const approvals = await db.approvals.all();
  const pending = approvals.find(
    (a) => a.upgradeId === upgrade.id && a.stage === "awaiting_salesforce_simulate" && a.status === "pending",
  );

  if (!pending) {
    return NextResponse.json({ error: "no_pending_simulate_approval" }, { status: 409 });
  }

  pending.status = "approved";
  pending.chosenOptionId = "simulate";
  pending.resolvedAt = new Date().toISOString();
  pending.resolvedBy = resolvedBy;
  pending.reviewerNote = body.note;
  await db.approvals.upsert(pending);

  upgrade.approvalQueue = upgrade.approvalQueue.filter((id) => id !== pending.id);
  upgrade.updatedAt = new Date().toISOString();
  await db.upgrades.upsert(upgrade);

  await audit({
    upgradeId: upgrade.id,
    actor: "human",
    human: resolvedBy,
    action: "salesforce.simulate.approved",
    target: "Salesforce",
    after: { approvalId: pending.id },
  });

  busEmit({ type: "approval_resolved", approvalId: pending.id, upgradeId: upgrade.id });
  busEmit({ type: "upgrade_updated", upgradeId: upgrade.id });

  return NextResponse.json({ ok: true, approvalId: pending.id });
}
