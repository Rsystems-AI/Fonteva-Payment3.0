"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Brain,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Network,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("fonteva_session");
      if (session) router.replace("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (
        (username === "admin" && password === "demo2026") ||
        (username === "jordan" && password === "demo2026")
      ) {
        localStorage.setItem(
          "fonteva_session",
          JSON.stringify({
            user: username,
            name: username === "jordan" ? "Jordan Miller" : "Admin User",
            role: "Fonteva Support Lead",
            loginAt: new Date().toISOString(),
          }),
        );
        router.replace("/");
      } else {
        setError("Invalid credentials. Try admin / demo2026");
        setLoading(false);
      }
    }, 700);
  };

  const features = [
    { icon: Brain, label: "AI-Powered Orchestration", desc: "7 specialist agents, one goal" },
    { icon: Zap, label: "Same-day Turnaround", desc: "From 2–3 days to under 30 minutes" },
    { icon: Network, label: "Salesforce + Stripe", desc: "Metadata API + payments in one flow" },
    { icon: CheckCircle2, label: "HITL Governance", desc: "You stay in control at every gate" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex w-[560px] shrink-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-16 -right-24 w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-brand-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <ShieldCheck size={22} className="text-indigo-300" />
            </div>
            <div>
              <div className="text-white text-xl font-bold tracking-wide">Fonteva</div>
              <div className="text-[10.5px] text-slate-400 uppercase tracking-[0.24em] mt-0.5">
                Payments 3.0 AI Assistant
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Ship every Payments 3.0
              <br />
              upgrade in a single day.
            </h2>
            <p className="mt-3 text-[13px] text-slate-400 leading-relaxed max-w-sm">
              AI agents inspect, plan, configure, validate, and report — with you on the
              wheel for every high-stakes decision. Salesforce Metadata API + Stripe,
              orchestrated end-to-end.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.label}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
              >
                <f.icon size={16} className="text-indigo-300 mb-2" />
                <div className="text-[12px] font-semibold text-white">{f.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="flex -space-x-2">
              {[
                "bg-indigo-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-violet-500",
                "bg-rose-500",
                "bg-sky-500",
                "bg-cyan-500",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white ${c}`}
                >
                  {["O", "R", "S", "$", "V", "F", "G"][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="text-[12px] text-white font-semibold">7 AI agents active</div>
              <div className="text-[10px] text-slate-500">GPT-4o Mini reasoning</div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] text-slate-600">© 2026 Fonteva AI Upgrade Assistant · Demo Environment</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Sign in to launch and supervise Payments 3.0 upgrades.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  placeholder="admin"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 focus-ring focus:border-indigo-400 transition"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="demo2026"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 focus-ring focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 animate-slide-in">
                <AlertTriangle size={13} className="shrink-0" />
                <p className="text-[12px] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 rounded-xl bg-indigo-600 text-white font-semibold text-[13.5px] flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
            <div className="text-[11.5px] font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={11} /> Demo credentials
            </div>
            <div className="flex flex-wrap gap-3 text-[12px] text-indigo-700">
              <span>
                username:{" "}
                <code className="font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                  admin
                </code>
              </span>
              <span>
                password:{" "}
                <code className="font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                  demo2026
                </code>
              </span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10.5px] text-slate-400">
              Secured demo environment · No production data is stored
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
