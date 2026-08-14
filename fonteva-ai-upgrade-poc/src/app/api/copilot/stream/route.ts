import { NextRequest } from "next/server";
import { getLLM } from "@/lib/llm";
import { db } from "@/lib/db";
import { ORGS, SCENARIOS } from "@/lib/seed";
import { AGENT_LIST } from "@/lib/agents/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buildGrounding(upgradeId?: string): Promise<string> {
  const upgrades = await db.upgrades.all();
  const approvals = await db.approvals.all();
  const activities = await db.activities.all();
  const scoped = upgradeId ? upgrades.filter((u) => u.id === upgradeId) : upgrades.slice(-8);
  const grounding = {
    now: new Date().toISOString(),
    agents: AGENT_LIST.map((a) => ({ id: a.id, name: a.name, role: a.role, responsibilities: a.responsibilities })),
    orgs: ORGS.map((o) => ({ id: o.id, name: o.name, region: o.region, segment: o.segment, currentPackageVersion: o.currentPackageVersion, targetPackageVersion: o.targetPackageVersion })),
    scenarios: SCENARIOS.map((s) => ({ id: s.id, title: s.title, summary: s.summary, expectedOutcome: s.expectedOutcome })),
    upgrades: scoped.map((u) => ({
      id: u.id,
      orgId: u.orgId,
      scenarioId: u.scenarioId,
      stage: u.stage,
      status: u.status,
      progress: u.progress,
      autoActions: u.autoActions,
      humanOverrides: u.humanOverrides,
      riskFlags: u.riskFlags,
      report: u.report,
      salesforceSimulation: u.salesforceSimulation
        ? {
            simulated: u.salesforceSimulation.simulated,
            planned: u.salesforceSimulation.appliedSteps.length,
            applied: u.salesforceSimulation.appliedSteps.filter((s) => s.status === "applied").length,
            layouts: u.salesforceSimulation.layoutsToUpgrade.length,
            jobs: u.salesforceSimulation.jobsToActivate.length,
            perms: u.salesforceSimulation.permsToGrant.length,
          }
        : null,
      stripeEmail: u.stripeEmail
        ? {
            to: u.stripeEmail.to,
            subject: u.stripeEmail.subject,
            requestedEvents: u.stripeEmail.requestedEvents,
            requestedRatesCount: u.stripeEmail.requestedRates.length,
            sent: u.stripeEmail.sent,
            sentAt: u.stripeEmail.sentAt,
          }
        : null,
    })),
    approvalsPending: approvals.filter((a) => a.status === "pending").map((a) => ({
      id: a.id, upgradeId: a.upgradeId, title: a.title, question: a.question,
      options: a.options.map((o) => o.label),
    })),
    recentActivity: activities.slice(-24).map((x) => ({ ts: x.createdAt, agent: x.agent, kind: x.kind, title: x.title })),
  };
  return JSON.stringify(grounding, null, 2);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { messages: Array<{ role: "user" | "assistant"; content: string }>; upgradeId?: string };
  const llm = getLLM();
  const grounding = await buildGrounding(body.upgradeId);
  const system = `You are the Fonteva Payments 3.0 Upgrade Copilot — a helpful AI assistant for engineers running the AI-powered upgrade pipeline. Answer questions grounded in the live data provided below. Be concise, precise, and specific. Use short paragraphs and bullets when useful. Reference upgrade IDs, agent names, and confidence scores where relevant. If the answer is not in the data, say so.

# LIVE DATA (JSON)
${grounding}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      send({ type: "start", ts: new Date().toISOString() });
      try {
        if (llm.streamChat) {
          await llm.streamChat(body.messages, (delta) => send({ type: "delta", text: delta }), { system });
        }
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
