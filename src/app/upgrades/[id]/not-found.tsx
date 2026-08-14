import Link from "next/link";
import { Rocket } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Rocket size={22} className="text-slate-400" />
      </div>
      <div className="text-[17px] font-bold text-slate-900">Upgrade not found</div>
      <p className="mt-2 text-[13px] text-slate-500">This upgrade run doesn&apos;t exist or has been removed.</p>
      <Link href="/upgrades" className="mt-5 inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-[12.5px]">
        ← Back to upgrades
      </Link>
    </div>
  );
}
