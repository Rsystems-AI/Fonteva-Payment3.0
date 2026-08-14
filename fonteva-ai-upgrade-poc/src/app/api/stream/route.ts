import { NextRequest } from "next/server";
import { subscribe } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Global SSE stream: any client can subscribe and receive activity + state events.
// Clients may filter by upgradeId via the `?upgradeId=` query param.

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filterId = url.searchParams.get("upgradeId");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: "hello", ts: new Date().toISOString() });

      const unsub = subscribe((ev) => {
        if (filterId) {
          if (ev.type === "activity" && ev.activity.upgradeId !== filterId) return;
          if (ev.type === "upgrade_updated" && ev.upgradeId !== filterId) return;
          if (ev.type === "approval_created" && ev.upgradeId !== filterId) return;
          if (ev.type === "approval_resolved" && ev.upgradeId !== filterId) return;
          if (ev.type === "stream_delta" && ev.delta.upgradeId !== filterId) return;
        }
        try {
          send(ev);
        } catch {
          // client dropped, cleanup happens in cancel below
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsub();
        }
      }, 15_000);

      const abort = () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
