import { CopilotChat } from "@/components/copilot/CopilotChat";
import { Card, CardHeader } from "@/components/ui/Card";
import { Sparkles, Zap, Shield, Brain } from "lucide-react";

export default function CopilotPage() {
  const features = [
    { icon: Brain, label: "Grounded reasoning", desc: "Every answer references live upgrade data, decisions, and audit entries — never a hallucination." },
    { icon: Zap, label: "Streaming responses", desc: "GPT-4o Mini streams tokens as they're generated, so you never wait for a full response." },
    { icon: Shield, label: "Enterprise safe", desc: "The Copilot cannot mutate state on its own — every action still goes through the agent pipeline with HITL gates." },
    { icon: Sparkles, label: "Cross-upgrade context", desc: "Ask about historical runs, compare confidence trends, and inspect why an agent chose what it did." },
  ];
  return (
    <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-[18px] font-bold text-slate-900">Ask about anything, in plain English.</h2>
          <p className="text-[12.5px] text-slate-600 mt-2 leading-relaxed">
            The Upgrade Copilot has access to every agent decision, HITL choice, Salesforce mutation, Stripe change,
            and audit entry across all upgrades. Ask it to summarize, diagnose, or explain — grounded on live data.
          </p>
        </div>
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.label} className="p-3.5 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <f.icon size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-900">{f.label}</div>
                  <div className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader
            title="What can I ask?"
            subtitle="Some grounded, useful examples"
            icon={<div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Sparkles size={14} /></div>}
          />
          <ul className="space-y-1.5 text-[12px] text-slate-700 leading-relaxed">
            <li className="flex gap-1.5"><span className="text-indigo-400">▸</span>Which upgrades hit HITL and why?</li>
            <li className="flex gap-1.5"><span className="text-indigo-400">▸</span>Show me the highest-risk decision this week.</li>
            <li className="flex gap-1.5"><span className="text-indigo-400">▸</span>Compare confidence between the Readiness and Stripe agents.</li>
            <li className="flex gap-1.5"><span className="text-indigo-400">▸</span>What's the average time-to-close across our completed upgrades?</li>
            <li className="flex gap-1.5"><span className="text-indigo-400">▸</span>Which orgs still have missing Stripe webhook events?</li>
          </ul>
        </Card>
      </div>
      <div className="h-[720px]">
        <CopilotChat compact />
      </div>
    </div>
  );
}
