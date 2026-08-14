import Link from "next/link";
import { db } from "@/lib/db";
import { ORGS, SCENARIOS } from "@/lib/seed";
import { StageBadge, StatusBadge } from "@/components/ui/StageBadge";
import { formatMinutes, formatRelative } from "@/lib/util";
import { Rocket, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function UpgradesPage() {
  const upgrades = (await db.upgrades.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[12.5px] text-slate-600">All upgrade runs from every engineer across every org.</div>
        <Link href="/upgrades/new">
          <Button size="md">
            <Rocket size={14} /> Launch new upgrade
          </Button>
        </Link>
      </div>

      <Card padded={false}>
        <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/60">
          <div className="col-span-4">Org</div>
          <div className="col-span-3">Scenario</div>
          <div className="col-span-2">Stage</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-1 text-right">Progress</div>
        </div>
        <div className="divide-y divide-slate-100">
          {upgrades.map((u) => {
            const org = ORGS.find((o) => o.id === u.orgId);
            const scenario = SCENARIOS.find((s) => s.id === u.scenarioId);
            const durMin = u.report?.completionTimeMinutes ?? Math.max(1, Math.round((Date.now() - new Date(u.createdAt).getTime()) / 60_000));
            return (
              <Link
                key={u.id}
                href={`/upgrades/${u.id}`}
                className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-indigo-50/40 transition-colors group"
              >
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {(org?.name ?? "??").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 truncate">{org?.name ?? u.orgId}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        v{org?.currentPackageVersion} → v{org?.targetPackageVersion} · {formatRelative(u.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 min-w-0 text-[12px] text-slate-700 truncate">{scenario?.title ?? u.scenarioId}</div>
                <div className="col-span-2"><StageBadge stage={u.stage} dot /></div>
                <div className="col-span-1"><StatusBadge status={u.status} /></div>
                <div className="col-span-1 text-[12px] text-slate-800 tabular-nums font-mono">{formatMinutes(durMin)}</div>
                <div className="col-span-1 flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: `${u.progress}%` }} />
                  </div>
                  <ArrowRight size={13} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Link>
            );
          })}
          {upgrades.length === 0 && (
            <div className="py-20 text-center">
              <Rocket size={32} className="mx-auto text-slate-300 mb-3" />
              <div className="text-[14px] font-semibold text-slate-900">No upgrades yet</div>
              <div className="text-[12px] text-slate-500 mt-1 mb-4">Launch your first Payments 3.0 upgrade to see the multi-agent pipeline in action.</div>
              <Link href="/upgrades/new"><Button>Start your first upgrade</Button></Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
