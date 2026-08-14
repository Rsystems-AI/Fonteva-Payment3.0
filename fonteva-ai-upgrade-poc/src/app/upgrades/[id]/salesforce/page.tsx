import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ORGS } from "@/lib/seed";
import { SalesforceSimulateView } from "@/components/upgrades/SalesforceSimulateView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const upgrade = await db.upgrades.findById(params.id);
  if (!upgrade) notFound();
  const org = ORGS.find((o) => o.id === upgrade.orgId);
  if (!org) notFound();
  return (
    <div className="mx-auto max-w-[1200px]">
      <SalesforceSimulateView upgrade={upgrade} org={org} />
    </div>
  );
}
