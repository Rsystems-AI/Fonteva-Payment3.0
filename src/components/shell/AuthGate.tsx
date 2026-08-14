"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("fonteva_session");
    const ok = !!raw;
    setAuthed(ok);
    setReady(true);
    if (!ok && path !== "/login") {
      router.replace("/login");
    }
    if (ok && path === "/login") {
      router.replace("/");
    }
  }, [path, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (path === "/login") {
    return <>{children}</>;
  }

  if (!authed) {
    return null; // being redirected
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 min-w-0 px-6 py-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
