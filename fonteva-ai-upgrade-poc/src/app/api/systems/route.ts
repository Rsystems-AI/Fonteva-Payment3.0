import { NextResponse } from "next/server";
import { loadOrg } from "@/lib/simulators/salesforce";
import { loadAccount } from "@/lib/simulators/stripe";
import { db } from "@/lib/db";
import { ORGS } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const salesforce: Record<string, unknown> = {};
  const stripe: Record<string, unknown> = {};
  for (const org of ORGS) {
    const s = await loadOrg(org.id);
    if (s) salesforce[org.id] = s;
    const st = await loadAccount(org.stripeAccountId);
    if (st) stripe[org.stripeAccountId] = st;
  }
  const upgrades = await db.upgrades.all();
  const stripeEmails = upgrades
    .filter((u) => !!u.stripeEmail)
    .map((u) => ({ upgradeId: u.id, orgId: u.orgId, ...u.stripeEmail! }));
  return NextResponse.json({ salesforce, stripe, stripeEmails });
}
