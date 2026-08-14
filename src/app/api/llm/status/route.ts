import { NextResponse } from "next/server";
import { getLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const info = getLLM().info();
  return NextResponse.json(info);
}
