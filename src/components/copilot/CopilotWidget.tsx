"use client";
import { useState } from "react";
import { Bot, MessageSquare, Sparkles } from "lucide-react";
import { CopilotChat } from "./CopilotChat";

export function CopilotWidget({ upgradeId, label }: { upgradeId?: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 pl-4 pr-5 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lift hover:shadow-xl transition-all flex items-center gap-2.5 group"
        >
          <div className="relative">
            <Bot size={20} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-700 animate-pulse-dot" />
          </div>
          <div className="text-left">
            <div className="text-[12px] font-bold leading-tight">Ask Copilot</div>
            <div className="text-[9.5px] opacity-80 flex items-center gap-1">
              <Sparkles size={9} /> {label ? label.slice(0, 20) : "GPT-4o Mini"}
            </div>
          </div>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[420px] h-[600px] max-h-[85vh] shadow-xl">
          <CopilotChat upgradeId={upgradeId} compact onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

// Icon exported for reuse in nav badges if needed.
export const CopilotIcon = MessageSquare;
