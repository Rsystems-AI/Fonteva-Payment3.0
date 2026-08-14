import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const approvals = await db.approvals.all();
  approvals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const decisions = await db.decisions.all();
  const decisionById = new Map(decisions.map((d) => [d.id, d]));
  const joined = approvals.map((a) => ({ approval: a, decision: decisionById.get(a.decisionId) ?? null }));
  return NextResponse.json({ approvals, joined });
}
