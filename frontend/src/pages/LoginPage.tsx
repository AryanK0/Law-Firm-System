import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Eye, EyeOff, AlertCircle, ArrowLeft, Shield, Sparkles } from "lucide-react";
import { useAuth } from "../content/AuthContext";
import { demoUsers } from "../types/user";

// Each user has a deterministic "password" for demo purposes
// Password is: first-name lowercase + "@psl" (e.g. jessica@psl)
function getDemoPassword(name: string): string {
  return name.split(" ")[0].toLowerCase() + "@psl";
}

// Employee IDs are zero-padded to 4 digits: PSL-0001, PSL-0002, etc.
function getEmployeeId(id: number): string {
  return `PSL-${String(id).padStart(4, "0")}`;
}

const ACCOUNTS = demoUsers.map((u) => ({
  employeeId: getEmployeeId(u.id),
  password: getDemoPassword(u.name),
  userId: u.id,
  name: u.name,
  role: u.role,
  practice: u.practice,
}));

export default function LoginPage() {
  const navigate = useNavigate();
  const { selectUser } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [shake, setShake]           = useState(false);
  const [hintOpen, setHintOpen]     = useState(false);

  // Clear error on input change
  useEffect(() => { setError(""); }, [employeeId, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulated network delay for realism
    await new Promise((r) => setTimeout(r, 700));

    const account = ACCOUNTS.find(
      (a) =>
        a.employeeId.toLowerCase() === employeeId.toLowerCase().trim() &&
        a.password === password
    );

    if (account) {
      selectUser(account.userId);
      navigate("/dashboard");
    } else {
      setLoading(false);
      setError("Invalid Employee ID or password. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-[#03060f] relative overflow-hidden flex items-center justify-center px-4">
      {/* Aurora orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Back to landing */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* Login card */}
      <div
        className={`relative z-10 w-full max-w-md login-card p-8 animate-slide-up ${shake ? "animate-[shake_0.5s_ease]" : ""}`}
        style={{ animationDuration: shake ? "0.5s" : undefined }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#0ea5e9,#06b6d4)",
              boxShadow: "0 0 32px rgba(37,99,235,0.45), 0 8px 20px rgba(0,0,0,0.4)",
            }}>
            <BriefcaseBusiness size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit,sans-serif", letterSpacing: "-0.025em" }}>
            Welcome back
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to{" "}
            <span className="text-indigo-400 font-semibold">Pearson Specter Litt</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Employee ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Employee ID
            </label>
            <input
              id="login-employee-id"
              type="text"
              className="input-glass"
              placeholder="PSL-0001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? "text" : "password"}
                className="input-glass pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-red-400"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary-hero mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="20" />
                </svg>
                Authenticating…
              </>
            ) : (
              <>
                <Shield size={17} />
                Sign In Securely
              </>
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setHintOpen(!hintOpen)}
            className="w-full text-xs text-center text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            {hintOpen ? "▲ Hide" : "▼ Show"} demo credentials
          </button>

          {hintOpen && (
            <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(3,6,15,0.6)" }}>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Demo Accounts</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {ACCOUNTS.map((a) => (
                  <button
                    key={a.userId}
                    type="button"
                    onClick={() => {
                      setEmployeeId(a.employeeId);
                      setPassword(a.password);
                      setHintOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left group"
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">{a.name}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: "rgba(14,165,233,0.12)", color: "#7dd3fc", border: "1px solid rgba(14,165,233,0.22)" }}>
                        {a.role}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400">{a.employeeId}</div>
                      <div className="text-[10px] font-mono text-slate-500">{a.password}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[11px] text-slate-600">
          Secured with 256-bit AES · SOC 2 Type II compliant
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
