import { db } from "@/lib/db";
import { ApprovalsView } from "@/components/approvals/ApprovalsView";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = (await db.approvals.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const decisions = await db.decisions.all();
  return <ApprovalsView initialApprovals={approvals} initialDecisions={decisions} />;
}
