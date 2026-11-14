import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const STATS = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "256-bit", label: "AES Encryption" },
  { value: "50+", label: "Jurisdictions" },
  { value: "10k+", label: "Active Matters" },
];

const HERO_LEDGER = [
  {
    matter: "Liberty Rail Antitrust",
    detail: "185.5 hrs",
    status: "Matched",
    open: false,
    amount: "$420,000.00",
  },
  {
    matter: "Blue Ridge Proxy Defense",
    detail: "142.0 hrs",
    status: "Matched",
    open: false,
    amount: "$385,000.00",
  },
  {
    matter: "Monarch Aviation Labor",
    detail: "94.0 hrs",
    status: "1 open review",
    open: true,
    amount: "$195,000.00",
  },
  {
    matter: "Sterling Biotech IP",
    detail: "118.0 hrs",
    status: "Matched",
    open: false,
    amount: "$248,500.00",
  },
];

const MODULES = [
  {
    id: "cases",
    tag: "Core",
    title: "Intelligent Case Management",
    desc: "Full matter lifecycle covering intake, milestones, billing, and closure in one unified workspace.",
    rows: [
      { label: "Concurrency control", detail: "Optimistic version locking prevents overwrite collisions" },
      { label: "Matter hearings", detail: "Automated court docket synchronization across jurisdictions" },
      { label: "Legal holds", detail: "Immutable evidence freeze under litigation hold orders" },
    ],
  },
  {
    id: "crm",
    tag: "CRM",
    title: "Client Intelligence Hub",
    desc: "Complete client profiles with relationship mapping, conflict detection, and engagement analytics.",
    rows: [
      { label: "Conflict screening", detail: "Real-time adverse party graph checks before onboarding" },
      { label: "Ethical walls", detail: "Automatic barrier enforcement across matter teams" },
      { label: "Engagement ledger", detail: "Client contact log paired with historical matter velocity" },
    ],
  },
  {
    id: "trust",
    tag: "Finance",
    title: "Trust and IOLTA Compliance",
    desc: "Automated three-way reconciliation, ABA-compliant ledgers, and real-time audit trails.",
    rows: [
      { label: "Bank vs. sub-ledger", detail: "Zero-variance verification across pooled client accounts" },
      { label: "Overdraft prevention", detail: "Database trigger blocks disbursements exceeding client escrow" },
      { label: "LEDES 1998B billing", detail: "Exportable UTBMS task and activity coded invoices" },
    ],
  },
  {
    id: "analytics",
    tag: "Insights",
    title: "Enterprise Analytics",
    desc: "Live revenue dashboards, attorney utilization metrics, and billing readiness tracking.",
    rows: [
      { label: "Practice revenue", detail: "Partner and senior counsel portfolio billing aggregation" },
      { label: "Ticket SLA watch", detail: "Escalation tracking for urgent compliance requests" },
      { label: "Audit visibility", detail: "Timestamped ledger of all permission changes and approvals" },
    ],
  },
];

const TRUST_ITEMS = [
  {
    title: "SOC 2 Type II certified infrastructure",
    note: "Continuous control monitoring across identity, storage, and session boundaries.",
  },
  {
    title: "Role-based access with audit logging",
    note: "Eight hierarchical clearance levels mapped to append-only verification records.",
  },
  {
    title: "ABA ethics compliance baked in",
    note: "Model Rule 1.15 property safekeeping and Rule 1.6 confidentiality screening.",
  },
  {
    title: "Multi-jurisdiction support",
    note: "Fifty-plus court venues, state bar trust schedules, and localized tax rules.",
  },
];

const FAQS = [
  {
    q: "How does IOLTA three-way reconciliation work?",
    a: "Every deposit, earned-fee transfer, and client disbursement posts simultaneously to the bank statement journal, the firm general ledger, and each client sub-ledger. If variance is non-zero, reconciliation locks pending partner review.",
  },
  {
    q: "How are ethical walls and adverse conflicts enforced?",
    a: "Before staffing an attorney or paralegal onto a matter, stored database procedures cross-check prior adverse representation and corporate affiliates, denying conflicting assignments automatically.",
  },
  {
    q: "Which user roles are separated across workspaces?",
    a: "Permissions scale cleanly across Managing Partner, Partner, Senior Associate, Associate, Paralegal, Finance Admin, IT Admin, and Intern. Associates see only staffed matters; IT Admins inspect systems telemetry without browsing client privilege ledgers.",
  },
  {
    q: "What database and runtime power the platform?",
    a: "Pearson Specter Litt runs an ACID-compliant MySQL 8.3 schema with stored procedures and cryptographic hash chains alongside a Java 25 LTS and Python FastAPI service tier.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const currentModule = MODULES.find((m) => m.id === activeModule) ?? MODULES[0];

  return (
    <div className="min-h-screen bg-paper text-ink relative">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 border-b border-rule bg-paper">
        <div className="container flex h-16 items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left transition-opacity duration-150 hover:opacity-85"
            aria-label="Pearson Specter Litt home"
          >
            <span className="icon-accent flex h-9 w-9 items-center justify-center">
              <BriefcaseBusiness size={18} aria-hidden="true" />
            </span>
            <span className="font-heading text-base font-medium tracking-tight text-ink">
              Pearson Specter Litt
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-2" aria-label="Primary">
            <a href="#modules" className="hover:text-ink transition-colors duration-150">
              Modules
            </a>
            <a href="#compliance" className="hover:text-ink transition-colors duration-150">
              Compliance
            </a>
            <a href="#questions" className="hover:text-ink transition-colors duration-150">
              Questions
            </a>
          </nav>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="btn-dusk min-h-[40px] px-5 text-sm"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero (Dusk Stage) ── */}
      <section className="relative flex min-h-[min(88dvh,820px)] items-center overflow-hidden">
        {/* Library Dusk Landscape Background */}
        <div
          className="absolute inset-0 z-0"
          data-slot="hero"
          data-alt="River in morning fog with reeds and trees along the bank"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Desna_river_Vinn_meadow_2016_G9.jpg/1920px-Desna_river_Vinn_meadow_2016_G9.jpg"
            srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Desna_river_Vinn_meadow_2016_G9.jpg/960px-Desna_river_Vinn_meadow_2016_G9.jpg 960w, https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Desna_river_Vinn_meadow_2016_G9.jpg/1280px-Desna_river_Vinn_meadow_2016_G9.jpg 1280w, https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Desna_river_Vinn_meadow_2016_G9.jpg/1920px-Desna_river_Vinn_meadow_2016_G9.jpg 1920w"
            sizes="100vw"
            width={6000}
            height={3850}
            alt="River in morning fog with reeds and trees along the bank"
            className="hero__photo"
            fetchPriority="high"
            style={{ objectPosition: "50% 45%" }}
          />
          <div className="hero__scrim" aria-hidden="true" />
        </div>

        <div className="container relative z-10 py-14 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Hero Headline + Subhead + Primary Action (Left 5 Columns on Pale Fog) */}
            <div className="lg:col-span-5 space-y-6">
              <h1
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.04]"
                style={{ color: "var(--color-day-ink)" }}
              >
                Legal operations, composed before court.
              </h1>

              <p
                className="text-base sm:text-lg leading-relaxed max-w-md"
                style={{ color: "var(--color-day-muted)" }}
              >
                Manage legal matters, three-way IOLTA ledgers, and compliance together.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="btn-dusk"
                >
                  <span>Access Platform</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <a
                  href="#modules"
                  className="inline-flex min-h-[48px] items-center px-3 text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: "var(--color-day-ink)" }}
                >
                  Explore modules
                </a>
              </div>
            </div>

            {/* Signature Product Run in Smoked Glass (Right 7 Columns) */}
            <div className="lg:col-span-7 min-w-0">
              <div
                className="dusk-glass p-6 sm:p-8"
                data-slot="hero-ledger"
                data-kind="product"
                data-alt="Smoked glass view of live firm matter and trust ledger reconciliation"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-4">
                  <div>
                    <h2 className="font-heading text-lg font-medium text-ink">
                      Fiduciary ledger run
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Three-way trust verification across active client matters
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-accent) 16%, transparent)",
                      color: "var(--color-accent-hi)",
                    }}
                  >
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Zero variance
                  </span>
                </div>

                <div className="divide-y divide-rule/60">
                  {HERO_LEDGER.map((row) => (
                    <div
                      key={row.matter}
                      className="flex items-center justify-between gap-4 py-3.5 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{row.matter}</div>
                        <div className="text-xs text-ink-muted num">{row.detail}</div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: row.open ? "var(--color-accent-2)" : "var(--color-accent)",
                          }}
                        >
                          {row.status}
                        </span>
                        <span className="font-medium text-ink num w-28 text-right">
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-inner)] px-4 py-3 text-xs"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-accent-2) 12%, transparent)",
                    color: "var(--color-accent-2)",
                  }}
                >
                  <span>Monarch Aviation labor escrow requires Senior Partner sign-off.</span>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="font-semibold underline-offset-4 hover:underline shrink-0"
                  >
                    Review in workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Firm Infrastructure Figures (Ruled Strip, Zero Icon Tiles) ── */}
      <section className="border-y border-rule py-14">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-rule">
            {STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className={`py-4 md:py-2 ${idx > 0 ? "md:pl-8" : ""} pr-6`}
              >
                <div className="font-heading text-3xl sm:text-4xl font-medium text-ink num">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-sm text-ink-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Modules Tour (Interactive List + Smoked-Glass Pane) ── */}
      <section id="modules" className="py-24 lg:py-32">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <h2 className="font-heading text-3xl sm:text-5xl font-medium text-ink">
              Four practice systems on one transactional core.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-ink-2">
              Select a workspace module to inspect its operational guarantees before signing in.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Ruled Module List */}
            <div className="lg:col-span-5 divide-y divide-rule border-t border-b border-rule">
              {MODULES.map((mod) => {
                const selected = mod.id === currentModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className="w-full py-5 text-left transition-colors duration-150 hover:bg-paper-2/50 px-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className="font-heading text-xl font-medium"
                        style={{
                          color: selected ? "var(--color-accent)" : "var(--color-ink)",
                        }}
                      >
                        {mod.title}
                      </span>
                      <span className="text-xs text-ink-muted">{mod.tag}</span>
                    </div>
                    {selected && (
                      <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                        {mod.desc}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Smoked-Glass Pane */}
            <div className="lg:col-span-7 min-w-0">
              <div className="dusk-glass p-7 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-5">
                  <div>
                    <h3 className="font-heading text-2xl font-medium text-ink">
                      {currentModule.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">{currentModule.desc}</p>
                  </div>
                </div>

                <dl className="divide-y divide-rule/70 mt-4">
                  {currentModule.rows.map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-4"
                    >
                      <dt className="sm:col-span-5 text-sm font-medium text-ink">
                        {item.label}
                      </dt>
                      <dd className="sm:col-span-7 text-sm text-ink-2">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 pt-4 border-t border-rule/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="btn-dusk-quiet"
                  >
                    <span>Explore module</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Compliance Dossier (Dusk Bone Well Surface) ── */}
      <section id="compliance" className="py-16 lg:py-24">
        <div className="container">
          <div className="dusk-well">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <h2
                  className="font-heading text-3xl sm:text-4xl font-medium"
                  style={{ color: "var(--color-well-ink)" }}
                >
                  Built for fiduciary scrutiny.
                </h2>
                <p
                  className="mt-3 text-base leading-relaxed"
                  style={{ color: "var(--color-well-muted)" }}
                >
                  Compliance checks execute in database triggers and immutable logs rather than advisory interface banners.
                </p>
              </div>

              <div className="lg:col-span-7">
                <div className="dusk-well-card divide-y divide-well-rule">
                  {TRUST_ITEMS.map((item) => (
                    <div key={item.title} className="p-5 sm:p-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          size={18}
                          className="shrink-0 mt-0.5"
                          style={{ color: "var(--color-accent-deep)" }}
                          aria-hidden="true"
                        />
                        <div>
                          <div
                            className="font-medium text-base"
                            style={{ color: "var(--color-well-ink)" }}
                          >
                            {item.title}
                          </div>
                          <p
                            className="mt-1 text-sm"
                            style={{ color: "var(--color-well-muted)" }}
                          >
                            {item.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conversational FAQ ── */}
      <section id="questions" className="py-20 lg:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <h2 className="font-heading text-3xl sm:text-4xl font-medium text-ink">
                Questions from managing partners.
              </h2>
              <p className="mt-3 text-sm text-ink-muted">
                Direct answers on IOLTA verification, access segregation, and underlying runtime infrastructure.
              </p>
            </div>

            <div className="lg:col-span-8 border-t border-rule">
              {FAQS.map((faq) => (
                <details key={faq.q} className="dusk-faq-item group">
                  <summary className="text-lg font-medium text-ink hover:text-accent transition-colors duration-150">
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="pb-6 pr-6 text-base text-ink-2 leading-relaxed">
                    <p>{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Close Band ── */}
      <section className="border-t border-rule py-20 lg:py-24 bg-paper-2/40">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-medium text-ink">
                Sign in to your workspace.
              </h2>
              <p className="mt-2 text-base text-ink-2">
                Access your assigned matters, client trust sub-ledgers, and firm-wide analytics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn-dusk shrink-0 self-start md:self-auto"
            >
              <span>Sign In Now</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Letter Close Footer ── */}
      <footer className="border-t border-rule py-10">
        <div className="container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-muted">
          <div className="font-medium text-ink">Pearson Specter Litt</div>
          <div className="flex flex-wrap items-center gap-6">
            <span>Java 25 LTS</span>
            <span>MySQL 8.3</span>
            <span>JavaFX</span>
            <span>Production v2.4</span>
          </div>
        </div>
        <div className="container mt-4 text-xs text-ink-muted" data-credits="true">
          Photographs: <a href="https://commons.wikimedia.org/wiki/File:Desna_river_Vinn_meadow_2016_G9.jpg" target="_blank" rel="noreferrer" className="underline hover:text-ink">George Chernilevsky</a> (Public domain, Wikimedia Commons).
        </div>
      </footer>
    </div>
  );
}
