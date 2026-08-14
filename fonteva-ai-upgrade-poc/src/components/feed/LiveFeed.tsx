"use client";
import { useMemo, useState } from "react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { ConfidenceBadge } from "@/components/ui/Confidence";
import { Badge } from "@/components/ui/Badge";
import { formatRelative } from "@/lib/util";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { AGENTS } from "@/lib/agents/registry";
import type { AgentActivity } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

const KIND_TONES: Record<AgentActivity["kind"], "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "violet" | "cyan"> = {
  thought: "neutral",
  action: "info",
  tool_call: "brand",
  tool_result: "success",
  decision: "violet",
  handoff: "cyan",
  notice: "warning",
  hitl_request: "warning",
  hitl_resolved: "success",
  reasoning_stream: "brand",
  reasoning_complete: "violet",
  narrative_stream: "brand",
};

export function LiveFeed({ initial, upgradeId, maxHeight = 480 }: { initial: AgentActivity[]; upgradeId?: string; maxHeight?: number }) {
  const [items, setItems] = useState<AgentActivity[]>(initial);

  useEventStream({
    upgradeId,
    onEvent: (ev) => {
      const e = ev as { type: string; activity?: AgentActivity };
      if (e.type === "activity" && e.activity) {
        setItems((prev) => {
          if (prev.some((p) => p.id === e.activity!.id)) return prev;
          return [e.activity!, ...prev].slice(0, 250);
        });
      }
    },
  });

  // Hide the transient streaming activity from the feed so they don't drown out
  // the human-readable events. The complete reasoning is still shown.
  const sorted = useMemo(
    () => [...items].filter((a) => a.kind !== "reasoning_stream" && a.kind !== "narrative_stream").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [items],
  );

  return (
    <div className="overflow-auto pr-1" style={{ maxHeight }}>
      <ul className="space-y-2">
        {sorted.map((a) => (
          <FeedItem key={a.id} activity={a} />
        ))}
        {sorted.length === 0 && (
          <li className="text-[12px] text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            Waiting for the first agent activity…
          </li>
        )}
      </ul>
    </div>
  );
}

function FeedItem({ activity }: { activity: AgentActivity }) {
  const [open, setOpen] = useState(false);
  const agent = AGENTS[activity.agent];
  const tone = KIND_TONES[activity.kind];
  const hasDetail = !!activity.detail || !!activity.payload;
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-soft animate-slide-in hover:border-slate-300 transition-all">
      <div className="flex items-start gap-2.5">
        <AgentAvatar id={activity.agent} size={26} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="text-[12.5px] font-semibold text-slate-900">{activity.title}</div>
            <Badge tone={tone} className="!text-[9.5px]">{activity.kind.replaceAll("_", " ")}</Badge>
            {activity.confidence !== undefined && <ConfidenceBadge value={activity.confidence} />}
          </div>
          <div className="text-[10.5px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>{agent.name}</span>
            {activity.target && <>·<span>{activity.target}</span></>}
            <span>·</span>
            <span>{formatRelative(activity.createdAt)}</span>
          </div>
          {open && activity.detail && (
            <div className="mt-2 text-[11.5px] text-slate-700 border-l-2 border-indigo-200 pl-2.5 leading-relaxed">
              {activity.detail}
            </div>
          )}
          {open && activity.payload && (
            <pre className="mt-2 text-[10.5px] font-mono text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2 overflow-x-auto">
{JSON.stringify(activity.payload, null, 2)}
            </pre>
          )}
        </div>
        {hasDetail && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
            aria-label="Toggle details"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </li>
  );
}
