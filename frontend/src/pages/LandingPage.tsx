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
    <div className="landing-page">
      {/* ── Top Bar ── */}
      <header className="landing-mast">
        <div className="container landing-mast__inner">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="landing-wordmark"
            aria-label="Pearson Specter Litt home"
          >
            <span className="landing-wordmark__mark">
              <BriefcaseBusiness size={18} aria-hidden="true" />
            </span>
            <span className="landing-wordmark__name">
              Pearson Specter Litt
            </span>
          </button>

          <nav className="landing-nav" aria-label="Primary">
            <a href="#modules">
              Modules
            </a>
            <a href="#compliance">
              Compliance
            </a>
            <a href="#questions">
              Questions
            </a>
          </nav>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="btn-dusk landing-mast__action"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero (Dusk Stage) ── */}
      <section className="landing-stage">
        {/* Library Dusk Landscape Background */}
        <div
          className="landing-stage__photo"
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

        <div className="container landing-stage__inner">
          <div className="landing-stage__grid">
            {/* Hero Headline + Subhead + Primary Action (Left 5 Columns on Pale Fog) */}
            <div className="landing-stage__copy">
              <h1
                className="landing-stage__title"
                style={{ color: "var(--color-day-ink)" }}
              >
                Legal operations, composed before court.
              </h1>

              <p
                className="landing-stage__lead"
                style={{ color: "var(--color-day-muted)" }}
              >
                Manage legal matters, three-way IOLTA ledgers, and compliance together.
              </p>

              <div className="landing-stage__actions">
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
                  className="landing-link"
                  style={{ color: "var(--color-day-ink)" }}
                >
                  Explore modules
                </a>
              </div>
            </div>

            {/* Signature Product Run in Smoked Glass (Right 7 Columns) */}
            <div className="landing-stage__product">
              <div
                className="matter-register"
                data-slot="hero-ledger"
                data-kind="product"
                data-alt="Smoked glass view of live firm matter and trust ledger reconciliation"
              >
                <div className="matter-register__head">
                  <div>
                    <h2>
                      Fiduciary ledger run
                    </h2>
                    <p>
                      Three-way trust verification across active client matters
                    </p>
                  </div>
                  <span
                    className="matter-register__status"
                  >
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Zero variance
                  </span>
                </div>

                <div className="matter-register__rows">
                  {HERO_LEDGER.map((row) => (
                    <div
                      key={row.matter}
                      className="matter-register__row"
                    >
                      <div>
                        <div>{row.matter}</div>
                        <div className="num">{row.detail}</div>
                      </div>
                      <div className="matter-register__row-end">
                        <span
                          className={row.open ? "is-open" : "is-matched"}
                        >
                          {row.status}
                        </span>
                        <span className="num">
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="matter-register__notice">
                  <span>Monarch Aviation labor escrow requires Senior Partner sign-off.</span>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="landing-link"
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
      <section className="landing-figures">
        <div className="container">
          <div className="landing-figures__grid">
            {STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className={`landing-figures__item ${idx === 0 ? "is-first" : ""}`}
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
      <section id="modules" className="landing-modules">
        <div className="container">
          <div className="landing-section-head">
            <h2 className="font-heading text-3xl sm:text-5xl font-medium text-ink">
              Four practice systems on one transactional core.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-ink-2">
              Select a workspace module to inspect its operational guarantees before signing in.
            </p>
          </div>

          <div className="landing-modules__grid">
            {/* Left Ruled Module List */}
            <div className="module-list">
              {MODULES.map((mod) => {
                const selected = mod.id === currentModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className="module-list__item"
                    aria-pressed={selected}
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
            <div className="module-dossier-wrap">
              <div className="module-dossier">
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
      <section id="compliance" className="landing-compliance">
        <div className="container">
          <div className="compliance-dossier">
            <div className="compliance-dossier__grid">
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
      <section id="questions" className="landing-questions">
        <div className="container">
          <div className="landing-questions__grid">
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
      <section className="landing-close">
        <div className="container">
          <div className="landing-close__inner">
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
      <footer className="landing-footer">
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
