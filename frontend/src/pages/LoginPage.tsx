import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useAuth } from "../content/AuthContext";
import { demoUsers } from "../types/user";

function getDemoPassword(name: string): string {
  return name.split(" ")[0].toLowerCase() + "@psl";
}

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
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    setError("");
  }, [employeeId, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
      setError("Invalid Employee ID or password. Please check your credentials and try again.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink relative flex items-center justify-center px-4 py-12">
      {/* Back to landing */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 text-sm font-medium text-ink-2 hover:text-ink transition-colors duration-150 group"
      >
        <ArrowLeft
          size={16}
          className="transition-transform duration-150 group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        <span>Back</span>
      </button>

      {/* Smoked glass sign-in surface */}
      <div
        className={`relative z-10 w-full max-w-md login-card p-8 sm:p-10 ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="mb-8">
          <div className="icon-accent flex h-11 w-11 items-center justify-center mb-5">
            <BriefcaseBusiness size={20} aria-hidden="true" />
          </div>
          <h1 className="font-heading text-3xl font-medium text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Sign in to Pearson Specter Litt
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="login-employee-id"
              className="block text-sm font-medium text-ink-2 mb-1.5"
            >
              Employee ID
            </label>
            <input
              id="login-employee-id"
              name="employeeId"
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

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-ink-2 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPwd ? "text" : "password"}
                className="input-glass pr-12"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink transition-colors duration-150"
              >
                {showPwd ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-[var(--radius-inner)] px-4 py-3 text-sm"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-error) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-error) 28%, transparent)",
                color: "var(--color-error)",
              }}
            >
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary-hero mt-2 w-full whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="40"
                    strokeDashoffset="20"
                  />
                </svg>
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <Shield size={16} aria-hidden="true" />
                <span>Sign In Securely</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-rule/70">
          <button
            type="button"
            onClick={() => setHintOpen(!hintOpen)}
            aria-expanded={hintOpen}
            className="w-full text-sm text-center text-ink-muted hover:text-ink transition-colors duration-150 py-1"
          >
            {hintOpen ? "Hide demo accounts" : "Show demo accounts"}
          </button>

          {hintOpen && (
            <div className="mt-3 rounded-[var(--radius-inner)] border border-rule bg-paper overflow-hidden divide-y divide-rule/60">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => {
                    setEmployeeId(a.employeeId);
                    setPassword(a.password);
                    setHintOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-paper-2 transition-colors duration-150 text-left group"
                >
                  <div>
                    <span className="text-sm font-medium text-ink group-hover:text-accent transition-colors duration-150">
                      {a.name}
                    </span>
                    <span className="ml-2 badge-blue text-xs px-2 py-0.5 rounded-full">
                      {a.role}
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs text-ink-muted">
                    <div>{a.employeeId}</div>
                    <div>{a.password}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          256-bit AES encryption, SOC 2 Type II infrastructure
        </p>
      </div>
    </div>
  );
}
