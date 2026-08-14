import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startUpgrade } from "@/lib/agents/orchestrator";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const upgrades = await db.upgrades.all();
  upgrades.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ upgrades });
}

const Body = z.object({
  orgId: z.string(),
  scenarioId: z.string(),
  createdBy: z.string().default("engineer@fonteva.example.com"),
  overrides: z
    .object({
      targetVersion: z.string().optional(),
      freshSimulatedState: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const upgrade = await startUpgrade(parsed.data);
  return NextResponse.json({ upgrade });
}
