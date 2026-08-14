import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ORGS, SCENARIOS } from "@/lib/seed";
import { UpgradeDetail } from "@/components/upgrades/UpgradeDetail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const upgrade = await db.upgrades.findById(params.id);
  if (!upgrade) notFound();
  const org = ORGS.find((o) => o.id === upgrade.orgId);
  const scenario = SCENARIOS.find((s) => s.id === upgrade.scenarioId);
  if (!org || !scenario) notFound();
  const activities = (await db.activities.all()).filter((a) => a.upgradeId === upgrade.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const decisions = (await db.decisions.all()).filter((d) => upgrade.decisions.includes(d.id));
  const approvals = (await db.approvals.all()).filter((a) => a.upgradeId === upgrade.id);
  return (
    <div className="mx-auto max-w-[1400px]">
      <UpgradeDetail
        upgrade={upgrade}
        org={org}
        scenario={scenario}
        activities={activities}
        decisions={decisions}
        approvals={approvals}
      />
    </div>
  );
}
