import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/db";
import { verifyChain } from "@/lib/audit";
import { CheckCircle2, LinkIcon, ShieldCheck, XCircle } from "lucide-react";
import { AGENTS } from "@/lib/agents/registry";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { formatRelative } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = (await db.audit.all()).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const chain = await verifyChain();

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-slate-900">Tamper-evident audit chain</div>
            <div className="text-[12.5px] text-slate-600 mt-0.5 leading-relaxed">
              Every agent + human action is chained via <span className="font-mono">SHA-256(prev + payload)</span>.
              Modifying any earlier row breaks the chain and the UI turns red.
            </div>
          </div>
          <Badge tone={chain.ok ? "success" : "danger"} dot>
            {chain.ok ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> chain valid ({entries.length} entries)
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" /> broken at #{chain.brokenAt}
              </>
            )}
          </Badge>
        </div>
      </Card>

      <Card padded={false}>
        <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/60">
          <div className="col-span-1">#</div>
          <div className="col-span-2">When</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-4">Action</div>
          <div className="col-span-2">Hash</div>
          <div className="col-span-1 text-right">Prev</div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[70vh] overflow-auto">
          {entries.map((e, i) => (
            <div key={e.id} className="grid grid-cols-12 gap-2 items-center px-5 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="col-span-1 text-[11px] font-mono text-slate-400 tabular-nums">
                {entries.length - i}
              </div>
              <div className="col-span-2 text-[11.5px] text-slate-700 tabular-nums">{formatRelative(e.ts)}</div>
              <div className="col-span-2 flex items-center gap-2 min-w-0">
                {e.agent ? (
                  <>
                    <AgentAvatar id={e.agent} size={22} />
                    <span className="text-[11.5px] text-slate-900 font-medium truncate">{AGENTS[e.agent].name}</span>
                  </>
                ) : (
                  <>
                    <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                      {(e.human ?? e.actor ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[11.5px] text-slate-900 truncate">{e.human ?? e.actor}</span>
                  </>
                )}
              </div>
              <div className="col-span-4 text-[11.5px] text-slate-800 truncate">
                {e.action}
                {e.target && <span className="text-slate-500"> · {e.target}</span>}
              </div>
              <div className="col-span-2 text-[10.5px] font-mono text-emerald-700 truncate" title={e.hash}>
                {e.hash.slice(0, 24)}
              </div>
              <div className="col-span-1 text-[10.5px] font-mono text-slate-500 text-right truncate flex items-center justify-end gap-1">
                <LinkIcon className="h-3 w-3" />
                {e.prevHash.slice(0, 8)}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="py-16 text-center text-[12px] text-slate-500">Audit log is empty. Start an upgrade to populate it.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
