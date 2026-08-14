"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { AGENTS } from "@/lib/agents/registry";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { formatRelative } from "@/lib/util";
import type { AgentActivity, AgentId, UpgradeStage } from "@/lib/types";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/util";

interface StreamBlock {
  streamId: string;
  agent: AgentId;
  stage: UpgradeStage;
  title: string;
  reasoning: string;
  narrative: string;
  done: boolean;
  createdAt: string;
}

function stripLeadingQuotes(s: string): string {
  return s
    .replace(/^\s*\[?\s*/, "")
    .replace(/^"/, "")
    .replace(/[",\n]+$/g, "")
    .replace(/",\s*"/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, "\"");
}

export function StreamingReasoning({
  upgradeId,
  activities,
}: {
  upgradeId: string;
  activities: AgentActivity[];
}) {
  const [blocks, setBlocks] = useState<Record<string, StreamBlock>>({});

  // Hydrate from existing activities: for each `reasoning_stream` seed a block
  // (with empty content); for `reasoning_complete` fill in from persisted payload.
  useEffect(() => {
    const next: Record<string, StreamBlock> = {};
    for (const a of activities) {
      const sid = (a.payload?.streamId as string | undefined) ?? undefined;
      if (!sid) continue;
      if (a.kind === "reasoning_stream") {
        if (!next[sid]) {
          next[sid] = {
            streamId: sid,
            agent: a.agent,
            stage: a.stage,
            title: a.title,
            reasoning: "",
            narrative: "",
            done: false,
            createdAt: a.createdAt,
          };
        }
      } else if (a.kind === "reasoning_complete") {
        const reasoningArr = (a.payload?.reasoning as string[] | undefined) ?? [];
        const narrative = (a.payload?.narrative as string | undefined) ?? "";
        next[sid] = {
          ...(next[sid] ?? {
            streamId: sid,
            agent: a.agent,
            stage: a.stage,
            title: a.title,
            reasoning: "",
            narrative: "",
            done: true,
            createdAt: a.createdAt,
          }),
          reasoning: reasoningArr.join("\n"),
          narrative,
          done: true,
        };
      }
    }
    setBlocks((prev) => {
      // Preserve any in-flight streaming that has newer content than the persisted state.
      const merged = { ...next };
      for (const [k, v] of Object.entries(prev)) {
        if (!merged[k] || (!merged[k].done && v.reasoning.length > merged[k].reasoning.length)) {
          merged[k] = v;
        }
      }
      return merged;
    });
  }, [activities]);

  useEventStream({
    upgradeId,
    onEvent: (ev) => {
      const e = ev as {
        type: string;
        delta?: { streamId: string; agent: AgentId; stage: UpgradeStage; kind: "reasoning" | "narrative"; text: string; done?: boolean };
      };
      if (e.type !== "stream_delta" || !e.delta) return;
      const d = e.delta;
      setBlocks((prev) => {
        const existing = prev[d.streamId] ?? {
          streamId: d.streamId,
          agent: d.agent,
          stage: d.stage,
          title: "Reasoning",
          reasoning: "",
          narrative: "",
          done: false,
          createdAt: new Date().toISOString(),
        };
        if (d.done) return { ...prev, [d.streamId]: { ...existing, done: true } };
        return {
          ...prev,
          [d.streamId]: {
            ...existing,
            reasoning: d.kind === "reasoning" ? existing.reasoning + d.text : existing.reasoning,
            narrative: d.kind === "narrative" ? existing.narrative + d.text : existing.narrative,
          },
        };
      });
    },
  });

  const list = useMemo(
    () => Object.values(blocks).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [blocks],
  );

  if (list.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="AI reasoning stream"
        subtitle="Live GPT-4o Mini reasoning from each specialist agent"
        icon={
          <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Brain size={15} />
          </div>
        }
        right={<span className="chip"><Sparkles size={10} /> streaming</span>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((b) => {
          const agent = AGENTS[b.agent];
          return (
            <div key={b.streamId} className={cn("rounded-2xl border p-4", b.done ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50/25")}>
              <div className="flex items-start gap-2.5">
                <AgentAvatar id={b.agent} size={30} active={!b.done} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[12.5px] font-semibold text-slate-900">{agent.name}</div>
                    <span className="chip">{b.stage.replaceAll("_", " ")}</span>
                    {!b.done && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse-dot" />
                        thinking…
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{formatRelative(b.createdAt)}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {b.reasoning && (
                  <div className="text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                    {stripLeadingQuotes(b.reasoning)}
                    {!b.done && <span className="stream-caret"></span>}
                  </div>
                )}
                {b.narrative && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[12.5px] text-slate-800 leading-relaxed">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Engineer-facing summary</div>
                    {stripLeadingQuotes(b.narrative)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
