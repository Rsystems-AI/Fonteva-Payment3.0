"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/util";

export type ToastType = "success" | "info" | "warning" | "error";
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  ttlMs?: number;
}

type Listener = (t: Toast) => void;
const listeners = new Set<Listener>();

export function showToast(t: Omit<Toast, "id">): void {
  const full: Toast = { ...t, id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  listeners.forEach((l) => l(full));
}

const ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const TONES: Record<ToastType, string> = {
  success: "bg-white border-emerald-200 text-emerald-900",
  info: "bg-white border-indigo-200 text-indigo-900",
  warning: "bg-white border-amber-200 text-amber-900",
  error: "bg-white border-rose-200 text-rose-900",
};

const ICON_TONES: Record<ToastType, string> = {
  success: "text-emerald-600 bg-emerald-100",
  info: "text-indigo-600 bg-indigo-100",
  warning: "text-amber-600 bg-amber-100",
  error: "text-rose-600 bg-rose-100",
};

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const l: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      const ttl = t.ttlMs ?? 4200;
      setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== t.id)), ttl);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "w-[340px] rounded-xl border shadow-lift px-3.5 py-3 flex items-start gap-3 animate-slide-in-right pointer-events-auto",
              TONES[t.type],
            )}
          >
            <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", ICON_TONES[t.type])}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
              {t.message && <div className="text-[12px] text-slate-600 mt-0.5">{t.message}</div>}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((p) => p.id !== t.id))}
              className="text-slate-400 hover:text-slate-700 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
