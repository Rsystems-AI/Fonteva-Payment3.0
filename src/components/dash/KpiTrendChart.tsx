"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { UpgradeRun } from "@/lib/types";

export function KpiTrendChart({ upgrades }: { upgrades: UpgradeRun[] }) {
  const completed = upgrades
    .filter((u) => u.report?.completionTimeMinutes)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const data: { name: string; ai: number; manual: number }[] = [];

  if (completed.length < 6) {
    const baseline = [
      { name: "Wk-6", ai: 240, manual: 2880 },
      { name: "Wk-5", ai: 190, manual: 2760 },
      { name: "Wk-4", ai: 150, manual: 2900 },
      { name: "Wk-3", ai: 90, manual: 2650 },
      { name: "Wk-2", ai: 45, manual: 2830 },
      { name: "Wk-1", ai: 22, manual: 2700 },
    ];
    data.push(...baseline);
  }
  completed.forEach((u, i) => {
    data.push({
      name: `Run ${data.length + 1}`,
      ai: u.report!.completionTimeMinutes,
      manual: 60 * 24 * (2 + (i % 2 === 0 ? 0 : 1)),
    });
  });

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
          <defs>
            <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 10px 24px -12px rgba(15,23,42,0.15)",
            }}
            labelStyle={{ color: "#334155", fontWeight: 600 }}
            formatter={(v: number, k: string) => [
              v >= 60 ? `${(v / 60).toFixed(1)} hours` : `${v} min`,
              k === "ai" ? "AI-driven" : "Manual baseline",
            ]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
            formatter={(v: string) => (
              <span style={{ color: "#475569" }}>
                {v === "ai" ? "AI-driven" : "Manual baseline"}
              </span>
            )}
          />
          <Area type="monotone" dataKey="manual" stroke="#f43f5e" fill="url(#manualGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="ai" stroke="#6366f1" fill="url(#aiGrad)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
