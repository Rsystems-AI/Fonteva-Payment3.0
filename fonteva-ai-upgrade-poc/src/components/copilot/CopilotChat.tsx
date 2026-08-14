"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User, X, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/util";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "Summarize this upgrade so far",
  "Which agent has the lowest confidence and why?",
  "What warnings did the reporting agent flag?",
  "How much time did the AI save vs. a manual upgrade?",
  "What HITL decisions are still pending?",
  "What is in the Stripe email draft?",
];

export function CopilotChat({
  upgradeId,
  compact = false,
  onClose,
}: {
  upgradeId?: string;
  compact?: boolean;
  onClose?: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", content: text, ts: new Date().toISOString() };
    const asstId = `a_${Date.now()}`;
    setMsgs((prev) => [...prev, userMsg, { id: asstId, role: "assistant", content: "", ts: new Date().toISOString(), streaming: true }]);
    setInput("");
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/copilot/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          upgradeId,
          messages: [
            ...msgs.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const raw of parts) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim()) as { type: string; text?: string; message?: string };
            if (evt.type === "delta" && evt.text) {
              setMsgs((prev) =>
                prev.map((m) => (m.id === asstId ? { ...m, content: m.content + evt.text! } : m)),
              );
            } else if (evt.type === "error") {
              setMsgs((prev) =>
                prev.map((m) => (m.id === asstId ? { ...m, content: (m.content || "") + `\n\n_Error: ${evt.message ?? "unknown"}_` } : m)),
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMsgs((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: (m.content || "") + `\n\n_Error: ${(e as Error).message}_` } : m)));
      }
    } finally {
      setMsgs((prev) => prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)));
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", compact ? "rounded-2xl border border-slate-200 shadow-lift" : "")}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center">
            <Bot size={17} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse-dot" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-slate-900">Upgrade Copilot</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles size={9} className="text-indigo-500" />
            GPT-4o Mini · grounded on live upgrade data{upgradeId ? ` · ${upgradeId.slice(0, 8)}` : ""}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} />
            </div>
            <div className="text-[13.5px] font-semibold text-slate-900">Ask anything about your upgrades.</div>
            <div className="text-[11.5px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              I have live access to every agent decision, HITL choice, Salesforce mutation, and Stripe change.
              Try one of these:
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11.5px] px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <MsgBubble key={m.id} m={m} />
        ))}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this upgrade, agents, or any HITL decision…"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 max-h-24"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-soft"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}

function MsgBubble({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  return (
    <div className={cn("flex gap-2.5 animate-slide-in", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
          isUser ? "bg-slate-200 text-slate-700" : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white",
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn("min-w-0 flex-1 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-left",
            isUser ? "bg-indigo-600 text-white rounded-tr-md" : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-md",
          )}
        >
          {m.content || (m.streaming && !isUser && <span className="text-slate-400">Thinking…</span>)}
          {m.streaming && !isUser && m.content && <span className="stream-caret"></span>}
        </div>
        {!isUser && !m.streaming && m.content && (
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(m.content);
              }}
              className="text-[10.5px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <Copy size={10} /> copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
