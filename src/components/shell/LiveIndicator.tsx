"use client";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { cn } from "@/lib/util";

export function LiveIndicator() {
  const [pulse, setPulse] = useState(false);
  const [connected, setConnected] = useState(false);
  const [count, setCount] = useState(0);

  useEventStream({
    onOpen: () => setConnected(true),
    onError: () => setConnected(false),
    onEvent: () => {
      setPulse(true);
      setCount((c) => c + 1);
      setTimeout(() => setPulse(false), 500);
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700">
      <span className="relative inline-flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full",
            connected ? "bg-emerald-400" : "bg-amber-400",
            pulse && "animate-ping",
          )}
        ></span>
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-amber-500",
          )}
        ></span>
      </span>
      <Radio size={12} className="text-slate-500" />
      <span className="text-[11.5px] font-medium">Live</span>
      <span className="text-[10.5px] text-slate-400 tabular-nums">· {count} evt</span>
    </div>
  );
}
