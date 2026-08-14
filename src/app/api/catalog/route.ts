import { NextResponse } from "next/server";
import { AGENT_LIST } from "@/lib/agents/registry";
import { ORGS, SCENARIOS } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ orgs: ORGS, scenarios: SCENARIOS, agents: AGENT_LIST });
}
