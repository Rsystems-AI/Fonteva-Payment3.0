import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emit, logActivity } from "@/lib/events";
import { record as audit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  chosenOptionId: z.string(),
  reviewerNote: z.string().optional(),
  reviewer: z.string().default("engineer@fonteva.example.com"),
  action: z.enum(["approve", "reject", "change"]).default("approve"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const approval = await db.approvals.findById(params.id);
  if (!approval) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (approval.status !== "pending") return NextResponse.json({ error: "already_resolved" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  approval.status = parsed.data.action === "reject" ? "rejected" : parsed.data.action === "change" ? "changed" : "approved";
  approval.chosenOptionId = parsed.data.chosenOptionId;
  approval.reviewerNote = parsed.data.reviewerNote;
  approval.resolvedBy = parsed.data.reviewer;
  approval.resolvedAt = new Date().toISOString();
  await db.approvals.upsert(approval);

  const upgrade = await db.upgrades.findById(approval.upgradeId);
  if (upgrade) {
    upgrade.approvalQueue = upgrade.approvalQueue.filter((id) => id !== approval.id);
    upgrade.status = "in_progress";
    upgrade.updatedAt = new Date().toISOString();
    await db.upgrades.upsert(upgrade);
  }

  await audit({
    upgradeId: approval.upgradeId,
    actor: "human",
    human: parsed.data.reviewer,
    action: `approval:${approval.status}`,
    target: approval.title,
    after: { chosenOptionId: approval.chosenOptionId, reviewerNote: approval.reviewerNote },
  });

  await logActivity({
    id: randomUUID(),
    upgradeId: approval.upgradeId,
    agent: approval.agent,
    stage: approval.stage,
    kind: "hitl_resolved",
    title: `HITL: ${approval.status}`,
    detail: `Reviewer chose "${approval.options.find((o) => o.id === approval.chosenOptionId)?.label}"${approval.reviewerNote ? ` — "${approval.reviewerNote}"` : ""}`,
    createdAt: new Date().toISOString(),
    payload: { approvalId: approval.id, chosenOptionId: approval.chosenOptionId, reviewer: parsed.data.reviewer },
  });
  emit({ type: "approval_resolved", approvalId: approval.id, upgradeId: approval.upgradeId });

  return NextResponse.json({ approval });
}
