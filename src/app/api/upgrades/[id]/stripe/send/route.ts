// POST /api/upgrades/[id]/stripe/send
//
// The Stripe email screen calls this when the engineer clicks "Send Email".
// It flips the persisted `stripeEmail.sent` flag on the upgrade, resolves the
// pending `awaiting_stripe_send` approval, and unblocks the orchestrator.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { record as audit } from "@/lib/audit";
import { emit as busEmit } from "@/lib/events";
import { markStripeEmailSent } from "@/lib/agents/stripe_integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const upgrade = await db.upgrades.findById(params.id);
  if (!upgrade) return NextResponse.json({ error: "upgrade_not_found" }, { status: 404 });
  if (!upgrade.stripeEmail) return NextResponse.json({ error: "no_email_drafted" }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { resolvedBy?: string; note?: string };
  const resolvedBy = body.resolvedBy || "engineer";

  const email = await markStripeEmailSent(upgrade, resolvedBy);

  const approvals = await db.approvals.all();
  const pending = approvals.find(
    (a) => a.upgradeId === upgrade.id && a.stage === "awaiting_stripe_send" && a.status === "pending",
  );

  if (pending) {
    pending.status = "approved";
    pending.chosenOptionId = "send";
    pending.resolvedAt = new Date().toISOString();
    pending.resolvedBy = resolvedBy;
    pending.reviewerNote = body.note;
    await db.approvals.upsert(pending);

    upgrade.approvalQueue = upgrade.approvalQueue.filter((id) => id !== pending.id);
    upgrade.updatedAt = new Date().toISOString();
    await db.upgrades.upsert(upgrade);

    busEmit({ type: "approval_resolved", approvalId: pending.id, upgradeId: upgrade.id });
  }

  await audit({
    upgradeId: upgrade.id,
    actor: "human",
    human: resolvedBy,
    action: "stripe.email.sent",
    target: "Stripe",
    after: { emailId: email?.id, to: email?.to },
  });

  busEmit({ type: "upgrade_updated", upgradeId: upgrade.id });

  return NextResponse.json({ ok: true, email });
}
