"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  UserCheck,
  Bot,
  ScrollText,
  Server,
  Sparkles,
  LogOut,
  Cog,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/util";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upgrades", label: "Upgrades", icon: Rocket },
  { href: "/approvals", label: "Approvals", icon: UserCheck },
  { href: "/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/systems", label: "Systems", icon: Server },
  { href: "/audit", label: "Audit Trail", icon: ScrollText },
];

export function Sidebar() {
  const path = usePathname();
  const [pending, setPending] = useState<number>(0);
  const [inFlight, setInFlight] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    const tick = async () => {
      try {
        const [ap, up] = await Promise.all([
          fetch("/api/approvals", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/upgrades", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancel) return;
        setPending((ap.approvals ?? []).filter((a: { status: string }) => a.status === "pending").length);
        setInFlight((up.upgrades ?? []).filter((u: { status: string }) => u.status === "in_progress" || u.status === "waiting_human").length);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 3500);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  return (
    <aside className="w-[260px] shrink-0 bg-sidebar text-sidebar-text flex flex-col min-h-screen sticky top-0 border-r border-sidebar-border">
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-white tracking-wide">Fonteva</div>
          <div className="text-[10px] text-sidebar-muted uppercase tracking-[0.18em] mt-0.5">Payments 3.0 AI</div>
        </div>
      </div>

      <div className="mx-4 mb-4 p-3 rounded-2xl bg-white/[0.05] border border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bot size={18} className="text-indigo-300" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar animate-pulse-dot" />
          </div>
          <div className="min-w-0">
            <div className="text-white text-[12px] font-semibold">Upgrade Copilot</div>
            <div className="text-[10.5px] text-sidebar-muted">
              {inFlight} active · {pending} awaiting
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/approvals" && pending > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all",
                active
                  ? "bg-sidebar-active text-white font-medium shadow-inner"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <Icon size={17} className={cn(active ? "text-indigo-300" : "text-sidebar-muted group-hover:text-white")} />
              <span className="flex-1 truncate">{item.label}</span>
              {showBadge && (
                <span className="text-[10px] font-bold bg-amber-400 text-amber-950 rounded-full px-1.5 py-0.5 tabular-nums">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-sidebar-border">
          <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shadow">
            JM
          </div>
          <div className="min-w-0">
            <div className="text-white text-[12.5px] font-semibold truncate">Jordan Miller</div>
            <div className="text-[10.5px] text-sidebar-muted">Fonteva Support Lead</div>
          </div>
        </div>
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] text-sidebar-text hover:bg-sidebar-hover hover:text-white w-full transition-all">
          <Cog size={15} />
          Settings
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("fonteva_session");
              window.location.href = "/login";
            }
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] text-sidebar-text hover:bg-rose-500/15 hover:text-rose-300 w-full transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
        <div className="pt-2 flex items-center gap-1.5 text-[10px] text-sidebar-muted">
          <Sparkles size={11} />
          <span>POC · demo environment</span>
        </div>
      </div>
    </aside>
  );
}
