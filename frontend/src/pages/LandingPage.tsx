import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Scale,
  Shield,
  BarChart3,
  Users,
  FileText,
  ArrowRight,
  ChevronRight,
  Zap,
  Lock,
  Globe,
  CheckCircle2,
} from "lucide-react";

const STATS = [
  { value: "99.9%", label: "Uptime SLA",        color: "#38bdf8", icon: Zap },
  { value: "256-bit", label: "AES Encryption",   color: "#22d3ee", icon: Lock },
  { value: "50+",   label: "Jurisdictions",       color: "#f59e0b", icon: Globe },
  { value: "10k+",  label: "Active Matters",      color: "#10b981", icon: FileText },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Intelligent Case Management",
    desc: "End-to-end matter lifecycle — intake, milestones, billing, and closure in one unified workspace.",
    accent: "#2563eb",
    accentRgb: "37,99,235",
    tag: "Core",
  },
  {
    icon: Users,
    title: "Client Intelligence Hub",
    desc: "360° client profiles with relationship mapping, conflict detection, and engagement analytics.",
    accent: "#0ea5e9",
    accentRgb: "14,165,233",
    tag: "CRM",
  },
  {
    icon: Shield,
    title: "Trust & IOLTA Compliance",
    desc: "Automated three-way reconciliation, ABA-compliant ledgers, and real-time audit trails.",
    accent: "#10b981",
    accentRgb: "16,185,129",
    tag: "Finance",
  },
  {
    icon: BarChart3,
    title: "Enterprise Analytics",
    desc: "Real-time revenue dashboards, attorney performance metrics, and predictive billing insights.",
    accent: "#f59e0b",
    accentRgb: "245,158,11",
    tag: "Insights",
  },
];

const TRUST_ITEMS = [
  "SOC 2 Type II certified infrastructure",
  "Role-based access with audit logging",
  "ABA ethics compliance baked in",
  "Multi-jurisdiction support",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#020810] relative overflow-hidden">
      {/* Aurora orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />
      <div className="hero-orb hero-orb-4" />

      {/* Interactive cursor glow */}
      <div
        className="fixed pointer-events-none z-0 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 65%)",
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: "translate(-50%,-50%)",
          transition: "left 0.6s ease, top 0.6s ease",
        }}
      />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.8) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: 0.025,
        }}
      />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b"
        style={{ borderColor: "rgba(56,189,248,0.07)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
              boxShadow: "0 0 22px rgba(37,99,235,0.40)",
            }}
          >
            <BriefcaseBusiness size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-sm" style={{ fontFamily: "Outfit,sans-serif" }}>
              PEARSON SPECTER LITT
            </span>
            <span
              className="ml-2 text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(37,99,235,0.14)",
                color: "#7dd3fc",
                border: "1px solid rgba(37,99,235,0.25)",
              }}
            >
              ENTERPRISE
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
            boxShadow: "0 0 20px rgba(37,99,235,0.32), 0 4px 12px rgba(0,0,0,0.3)",
            border: "1px solid rgba(56,189,248,0.25)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(37,99,235,0.48), 0 6px 18px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(37,99,235,0.32), 0 4px 12px rgba(0,0,0,0.3)";
          }}
        >
          Sign In
          <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-6 pt-24 pb-20">
        {/* Eyebrow badge */}
        <div className="animate-slide-up inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold uppercase tracking-[0.14em]"
          style={{
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(56,189,248,0.18)",
            color: "#7dd3fc",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" style={{ boxShadow: "0 0 6px #38bdf8" }} />
          Enterprise Legal Cloud — Production v2.4
        </div>

        {/* Headline */}
        <h1
          className="animate-slide-up-d1 text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.06]"
          style={{ fontFamily: "Outfit, Inter, sans-serif", letterSpacing: "-0.03em" }}
        >
          The Future of{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #60a5fa 0%, #38bdf8 50%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Legal Operations
          </span>
          <br />is Already Here.
        </h1>

        {/* Sub */}
        <p className="animate-slide-up-d2 text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Pearson Specter Litt's enterprise-grade legal management platform — built on Java 21, MySQL 8.3,
          and a security-first architecture trusted by the world's most demanding firms.
        </p>

        {/* CTA */}
        <div className="animate-slide-up-d3 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="group flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #0ea5e9 100%)",
              boxShadow: "0 0 35px rgba(37,99,235,0.42), 0 8px 24px rgba(0,0,0,0.4)",
              border: "1px solid rgba(56,189,248,0.30)",
              transition: "all 220ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 52px rgba(37,99,235,0.55), 0 12px 32px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px rgba(37,99,235,0.42), 0 8px 24px rgba(0,0,0,0.4)";
            }}
          >
            Access Platform
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Stats */}
        <div className="animate-slide-up-d4 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-20">
          {STATS.map((s) => (
            <div key={s.label} className="login-card p-5 text-center group cursor-default"
              style={{ borderColor: "rgba(56,189,248,0.10)" }}>
              <s.icon size={18} className="mx-auto mb-2.5 transition-transform group-hover:scale-110" style={{ color: s.color }} />
              <div
                className="text-2xl font-black mb-1"
                style={{
                  fontFamily: "Outfit,sans-serif",
                  background: `linear-gradient(135deg, ${s.color}, white)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.value}
              </div>
              <div className="text-xs text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="eyebrow mb-4">Core Modules</p>
            <h2
              className="text-4xl font-black text-white"
              style={{ fontFamily: "Outfit,sans-serif", letterSpacing: "-0.025em" }}
            >
              Everything your firm{" "}
              <span style={{
                background: "linear-gradient(135deg,#3b82f6,#22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                needs to win
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-premium p-7 group cursor-pointer"
                style={{ borderColor: `rgba(${f.accentRgb},0.15)` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, rgba(${f.accentRgb},0.20), rgba(${f.accentRgb},0.08))`,
                      border: `1px solid rgba(${f.accentRgb},0.28)`,
                      boxShadow: `0 0 16px rgba(${f.accentRgb},0.10)`,
                    }}
                  >
                    <f.icon size={19} style={{ color: f.accent }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                        {f.title}
                      </h3>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                        style={{
                          background: `rgba(${f.accentRgb},0.12)`,
                          color: f.accent,
                          border: `1px solid rgba(${f.accentRgb},0.22)`,
                        }}
                      >
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                  Explore module
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div
            className="login-card px-8 py-6 flex flex-wrap items-center justify-center gap-6"
            style={{ borderColor: "rgba(56,189,248,0.12)" }}
          >
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 size={14} style={{ color: "#22d3ee" }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto login-card p-12" style={{ borderColor: "rgba(37,99,235,0.18)" }}>
          <p className="eyebrow mb-4">Ready to Transform?</p>
          <h2
            className="text-4xl font-black text-white mb-4"
            style={{ fontFamily: "Outfit,sans-serif", letterSpacing: "-0.025em" }}
          >
            Sign in to your{" "}
            <span style={{
              background: "linear-gradient(135deg,#60a5fa,#22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              workspace
            </span>
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Access your matters, clients, and firm-wide analytics in seconds.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary-hero max-w-xs mx-auto flex items-center justify-center gap-2"
          >
            Sign In Now
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 border-t px-6 py-8 text-center"
        style={{ borderColor: "rgba(56,189,248,0.07)" }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-400">PEARSON SPECTER LITT — Enterprise Legal Cloud</span>
          <span className="font-mono">Java 21 LTS · MySQL 8.3 · JavaFX · Production v2.4</span>
        </div>
      </footer>
    </div>
  );
}
