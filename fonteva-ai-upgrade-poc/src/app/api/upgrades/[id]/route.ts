import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const upgrade = await db.upgrades.findById(params.id);
  if (!upgrade) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const activities = (await db.activities.all()).filter((a) => a.upgradeId === params.id);
  activities.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const decisions = (await db.decisions.all()).filter((d) => upgrade.decisions.includes(d.id));
  const approvals = (await db.approvals.all()).filter((a) => a.upgradeId === params.id);
  return NextResponse.json({ upgrade, activities, decisions, approvals });
}
