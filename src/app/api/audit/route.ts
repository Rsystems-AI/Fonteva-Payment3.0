import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyChain } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await db.audit.all();
  entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const chain = await verifyChain();
  return NextResponse.json({ entries, chain });
}
