"use client";
import { useEffect, useRef } from "react";

export interface StreamOpts {
  upgradeId?: string;
  onEvent?: (ev: unknown) => void;
  onOpen?: () => void;
  onError?: (e: unknown) => void;
}

export function useEventStream(opts: StreamOpts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const url = opts.upgradeId ? `/api/stream?upgradeId=${encodeURIComponent(opts.upgradeId)}` : "/api/stream";
    const es = new EventSource(url);
    es.onopen = () => optsRef.current.onOpen?.();
    es.onerror = (e) => optsRef.current.onError?.(e);
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        optsRef.current.onEvent?.(parsed);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [opts.upgradeId]);
}
