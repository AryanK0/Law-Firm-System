import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { CardComponent } from "../components/CardComponent";
import {
  formatCaseCode,
  formatCompactDateTime,
  formatCurrency,
  formatDate,
  formatDateTime,
  truncate,
} from "../lib/format";
import {
  getAnalytics,
  getClients,
  getOverview,
  type AnalyticsResponse,
  type ClientRecord,
  type OverviewResponse,
} from "../services/api";

const COLORS = ["#22D3EE", "#3B82F6", "#06B6D4", "#38BDF8", "#0EA5E9", "#0284C7"];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(11, 17, 32, 0.96)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "1rem",
  boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
};

const emptyAnalytics: AnalyticsResponse = {
  summary: {
    total_cases: 0,
    open_cases: 0,
    total_tickets: 0,
    breached_tickets: 0,
    documents: 0,
  },
  case_status: [],
  billing: [],
  ticket_status: [],
  roles: [],
};

const emptyOverview: OverviewResponse = {
  firm: {
    name: "Precision in Legal Management",
    tagline: "Premium operations workspace for matters, access, hearings, and support.",
  },
  summary: {
    active_people: 0,
    open_matters: 0,
    upcoming_hearings: 0,
    open_tickets: 0,
    active_clients: 0,
    tracked_revenue: 0,
    pending_bills: 0,
    sla_risk: 0,
  },
  featured_people: [],
  role_access: [],
  priority_matters: [],
  upcoming_hearings: [],
  recent_documents: [],
  support_watch: [],
  department_coverage: [],
  client_portfolio: [],
  recent_interactions: [],
  billing_watch: [],
};

function getVisibleFileName(path: string | null | undefined) {
  const fileName = path?.split("/").pop() ?? "Unknown file";
  return fileName.replace(/^[a-f0-9]{32}_/i, "");
}

function getInitials(name: string | null | undefined) {
  if (!name) {
    return "NA";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getMatterTone(status: string | null | undefined) {
  switch (status) {
    case "Open":
      return "bg-primary/10 text-primary";
    case "Hearing Scheduled":
      return "bg-blue-500/10 text-blue-300";
    case "Drafting":
      return "bg-amber-500/10 text-amber-300";
    case "Negotiation":
      return "bg-cyan-500/10 text-cyan-300";
    case "Closed":
      return "bg-white/10 text-slate-300";
    default:
      return "bg-white/10 text-slate-300";
  }
}

function getTicketTone(priority: string | null | undefined, breached?: boolean | null) {
  if (breached) {
    return "bg-red-500/10 text-red-300";
  }

  switch (priority) {
    case "High":
      return "bg-amber-500/10 text-amber-300";
    case "Medium":
      return "bg-blue-500/10 text-blue-300";
    case "Low":
      return "bg-emerald-500/10 text-emerald-300";
    default:
      return "bg-white/10 text-slate-300";
  }
}

function getAccessTone(level: string | null | undefined) {
  switch (level) {
    case "Executive":
      return "border-primary/30 bg-primary/10 text-primary";
    case "Leadership":
      return "border-blue-400/25 bg-blue-500/10 text-blue-200";
    case "Senior Matter Access":
      return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
    case "Matter Access":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

function getConfidentialityTone(level: string | null | undefined) {
  switch (level) {
    case "Highly Confidential":
      return "bg-red-500/10 text-red-300";
    case "Confidential":
      return "bg-amber-500/10 text-amber-300";
    case "Internal":
      return "bg-cyan-500/10 text-cyan-300";
    default:
      return "bg-white/10 text-slate-300";
  }
}

function getBillingTone(status: string | null | undefined) {
  switch (status) {
    case "Pending":
      return "bg-amber-500/10 text-amber-300";
    case "Approved":
      return "bg-emerald-500/10 text-emerald-300";
    default:
      return "bg-white/10 text-slate-300";
  }
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(emptyAnalytics);
  const [overview, setOverview] = useState<OverviewResponse>(emptyOverview);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getAnalytics(), getOverview(), getClients()])
      .then(([analyticsData, overviewData, clientData]) => {
        if (!active) {
          return;
        }

        setAnalytics(analyticsData);
        setOverview(overviewData);
        setClients(clientData);
        setError(null);
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const caseMix = useMemo(() => analytics.case_status.slice(0, 6), [analytics.case_status]);
  const roleMix = useMemo(
    () => analytics.roles.filter((item) => item.value > 0).slice(0, 5),
    [analytics.roles],
  );
  const featuredPeople = useMemo(
    () => overview.featured_people.slice(0, 4),
    [overview.featured_people],
  );
  const roleAccess = useMemo(() => overview.role_access.slice(0, 4), [overview.role_access]);
  const priorityMatters = useMemo(
    () => overview.priority_matters.slice(0, 4),
    [overview.priority_matters],
  );
  const upcomingHearings = useMemo(
    () => overview.upcoming_hearings.slice(0, 4),
    [overview.upcoming_hearings],
  );
  const recentDocuments = useMemo(
    () => overview.recent_documents.slice(0, 4),
    [overview.recent_documents],
  );
  const supportWatch = useMemo(
    () => overview.support_watch.slice(0, 4),
    [overview.support_watch],
  );
  const departmentCoverage = useMemo(
    () => overview.department_coverage.slice(0, 5),
    [overview.department_coverage],
  );
  const clientPortfolio = useMemo(
    () => overview.client_portfolio.slice(0, 5),
    [overview.client_portfolio],
  );
  const recentInteractions = useMemo(
    () => overview.recent_interactions.slice(0, 5),
    [overview.recent_interactions],
  );
  const billingWatch = useMemo(
    () => overview.billing_watch.slice(0, 5),
    [overview.billing_watch],
  );
  const caseTotal = useMemo(
    () => caseMix.reduce((total, item) => total + item.value, 0),
    [caseMix],
  );

  return (
    <div>
      <section className="mb-20 grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.92fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles size={14} />
            Premium Operations View
          </span>

          <h1 className="mt-6 max-w-3xl pb-2">
            <span className="mb-2 block text-5xl font-semibold tracking-tight leading-[1.02] text-foreground md:text-6xl">
              Precision in Legal
            </span>
            <span
              className="block pb-1 text-5xl font-semibold tracking-tight leading-[1.02] text-transparent md:text-6xl"
              style={{ textShadow: "0 0 20px rgba(34, 211, 238, 0.25)" }}
            >
              <span className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text pb-1 text-transparent">
                Management
              </span>
            </span>
          </h1>

          <div className="mt-6 flex items-center gap-4">
            <div
              className="h-0.5 w-32 rounded-full opacity-80"
              style={{ background: "linear-gradient(90deg, #22D3EE, #3B82F6)" }}
            />
          </div>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Streamline your practice with a premium legal operations workspace that
            keeps matters, hearings, billing, documents, and support activity in one
            refined command view.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="nav-pill px-4 py-2 text-sm text-slate-200">
              {loading ? "..." : `${overview.summary.active_people} active people`}
            </span>
            <span className="nav-pill px-4 py-2 text-sm text-slate-200">
              {loading ? "..." : `${overview.summary.open_matters} live matters`}
            </span>
            <span className="nav-pill px-4 py-2 text-sm text-slate-200">
              {loading ? "..." : `${overview.summary.upcoming_hearings} hearings ahead`}
            </span>
            <span className="nav-pill px-4 py-2 text-sm text-slate-200">
              {loading ? "..." : `${overview.summary.open_tickets} support items`}
            </span>
          </div>
        </div>

        <div
          className="card-premium relative overflow-hidden p-8"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(34, 211, 238, 0.16), transparent 28%), rgba(255, 255, 255, 0.03)",
          }}
        >
          <div className="relative">
            <p className="eyebrow">Operations Pulse</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Live portfolio and revenue watch
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="card-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Tracked revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {loading ? "..." : formatCurrency(overview.summary.tracked_revenue)}
                </p>
              </div>
              <div className="card-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Pending bills
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {loading ? "..." : overview.summary.pending_bills}
                </p>
              </div>
              <div className="card-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Active clients
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {loading ? "..." : overview.summary.active_clients}
                </p>
              </div>
              <div className="card-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  SLA watch
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {loading ? "..." : overview.summary.sla_risk}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Billing Watch</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Pending approvals and the heaviest billed matters in view.
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  {loading ? "..." : `${billingWatch.length} visible`}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {billingWatch.length === 0 ? (
                  <EmptyPanel message="No billing items available yet." />
                ) : (
                  billingWatch.slice(0, 3).map((bill) => (
                    <div
                      key={bill.bill_id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {formatCaseCode(bill.case_code, `Matter #${bill.bill_id}`)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {bill.client_name || bill.title || "Client detail pending"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(bill.amount)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getBillingTone(
                            bill.status,
                          )}`}
                        >
                          {bill.status || "Queued"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-8 card-premium p-6 text-sm text-red-300">{error}</div>
      ) : null}

      <section className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CardComponent
          title="Active Cases"
          value={loading ? "..." : overview.summary.open_matters}
          description="Matters in motion across active practice teams"
          icon={<Briefcase size={20} />}
        />
        <CardComponent
          title="Clients"
          value={loading ? "..." : overview.summary.active_clients || clients.length}
          description="Clients with live matters or tracked portfolio activity"
          icon={<Users size={20} />}
        />
        <CardComponent
          title="Monthly Billing"
          value={loading ? "..." : formatCurrency(overview.summary.tracked_revenue)}
          description="Visible billed value across the current matter set"
          icon={<DollarSign size={20} />}
        />
        <CardComponent
          title="Open Tickets"
          value={loading ? "..." : overview.summary.open_tickets}
          description="Support requests still moving through the queue"
          icon={<AlertCircle size={20} />}
        />
      </section>

      <section className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="card-premium p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Matter Mix</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Case status overview
              </h2>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
              {loading ? "..." : `${analytics.summary.total_cases} total`}
            </span>
          </div>

          {caseMix.length === 0 ? (
            <div className="mt-8">
              <EmptyPanel message="No case status data available yet." />
            </div>
          ) : (
            <div className="mt-8 grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 18, bottom: 10, left: 18 }}>
                    <Pie
                      data={caseMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={94}
                      paddingAngle={3}
                      stroke="rgba(2, 6, 23, 0.45)"
                      strokeWidth={3}
                      dataKey="value"
                    >
                      {caseMix.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} matters`}
                      contentStyle={TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {caseMix.map((item, index) => {
                  const share = caseTotal ? Math.round((item.value / caseTotal) * 100) : 0;

                  return (
                    <div
                      key={item.name}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{item.value}</p>
                          <p className="text-[11px] text-slate-400">{share}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card-premium p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Revenue Pulse</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Billing overview
              </h2>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
              {loading ? "..." : formatCurrency(overview.summary.tracked_revenue)}
            </span>
          </div>

          {analytics.billing.length === 0 ? (
            <div className="mt-8">
              <EmptyPanel message="No billing data available yet." />
            </div>
          ) : (
            <div className="mt-8">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.billing}
                    margin={{ top: 10, right: 8, bottom: 12, left: -18 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.08)"
                    />
                    <XAxis
                      dataKey="name"
                      height={48}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => truncate(formatCaseCode(String(value)), 10)}
                    />
                    <YAxis
                      width={44}
                      tickLine={false}
                      axisLine={false}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, _name, item) => [
                        formatCurrency(Number(value)),
                        formatCaseCode(String(item.payload?.name ?? "Matter")),
                      ]}
                    />
                    <Bar dataKey="amount" fill="#22D3EE" radius={[10, 10, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Visible matters
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {analytics.billing.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Pending bills
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {overview.summary.pending_bills}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Documents
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {analytics.summary.documents}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mb-16 grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="card-premium p-8">
          <p className="eyebrow">Matter Board</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Priority matters</h2>

          <div className="mt-8 space-y-4">
            {priorityMatters.length === 0 ? (
              <EmptyPanel message="No matters available." />
            ) : (
              priorityMatters.map((matter) => (
                <div
                  key={matter.case_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {formatCaseCode(matter.case_code, `Matter #${matter.case_id}`)}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
                        {matter.title || "Untitled matter"}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getMatterTone(
                        matter.status,
                      )}`}
                    >
                      {matter.status || "Unknown"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-300">
                    {matter.client_name || "Client pending"} | {matter.case_type || "General"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 ${getConfidentialityTone(
                        matter.confidentiality_level,
                      )}`}
                    >
                      {matter.confidentiality_level || "Internal"}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
                      Lead {matter.lead_partner_name || "unassigned"}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    Target date {formatDate(matter.end_date, "Open ended")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-premium p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Support Desk</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Open ticket watch
              </h2>
            </div>
            <AlertCircle className="text-primary" size={20} />
          </div>

          <div className="mt-8 space-y-4">
            {supportWatch.length === 0 ? (
              <EmptyPanel message="No open tickets available." />
            ) : (
              supportWatch.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">Ticket #{ticket.ticket_id}</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {truncate(ticket.description, 88)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getTicketTone(
                        ticket.priority,
                        ticket.breach_flag,
                      )}`}
                    >
                      {ticket.breach_flag ? "Breach risk" : ticket.priority || "Open"}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    Owner {ticket.assigned_to_name || "unassigned"} | raised by{" "}
                    {ticket.raised_by_name || "unknown"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Deadline {formatDateTime(ticket.resolution_deadline, "Not set")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-premium p-8">
          <p className="eyebrow">Client Pulse</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Relationship activity
          </h2>

          <div className="mt-8 space-y-4">
            {recentInteractions.length === 0 ? (
              <EmptyPanel message="No client interactions available." />
            ) : (
              recentInteractions.map((interaction) => (
                <div
                  key={interaction.interaction_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {interaction.client_name}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
                        {interaction.interaction_type || "Client update"}
                      </h3>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                      {formatCompactDateTime(interaction.datetime, "Not set")}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-300">
                    {truncate(interaction.notes, 120)}
                  </p>
                  <p className="mt-4 text-xs text-slate-400">
                    Led by {interaction.employee_name || "team member not listed"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mb-16 grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="card-premium p-8">
          <p className="eyebrow">Calendar</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Upcoming hearings</h2>

          <div className="mt-8 space-y-4">
            {upcomingHearings.length === 0 ? (
              <EmptyPanel message="No hearings scheduled." />
            ) : (
                upcomingHearings.map((hearing, index) => (
                  <Link
                    key={hearing.hearing_id}
                    to={`/cases/${hearing.case_id}`}
                    className="group relative block pl-8"
                  >
                    {index !== upcomingHearings.length - 1 ? (
                      <span className="absolute left-[11px] top-8 h-[calc(100%+0.75rem)] w-px bg-white/10" />
                    ) : null}
                    <span className="absolute left-0 top-1.5 h-6 w-6 rounded-full border border-primary/30 bg-primary/10" />
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 smooth-transition group-hover:-translate-y-0.5 group-hover:bg-white/[0.05]">
                      <p className="text-sm font-semibold text-primary">
                        {formatCaseCode(hearing.case_code, `Matter #${hearing.case_id}`)}
                      </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      {hearing.court_name || "Court to be confirmed"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {formatDate(hearing.date)} | {hearing.location || "Location pending"}
                    </p>
                      <p className="mt-3 text-sm text-slate-400">
                        {truncate(hearing.notes, 96)}
                      </p>
                    </div>
                  </Link>
                ))
            )}
          </div>
        </div>

        <div className="card-premium p-8">
          <p className="eyebrow">Document Feed</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Recent filings</h2>

          <div className="mt-8 space-y-4">
            {recentDocuments.length === 0 ? (
              <EmptyPanel message="No documents available." />
            ) : (
                recentDocuments.map((document) => (
                  <Link
                    key={document.document_id}
                    to="/documents"
                    className="block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 smooth-transition hover:-translate-y-0.5 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary">
                        {formatCaseCode(document.case_code, `Matter #${document.document_id}`)}
                      </p>
                      <h3 className="mt-1 break-words text-base font-semibold text-foreground">
                        {getVisibleFileName(document.file_path)}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium ${getConfidentialityTone(
                        document.confidentiality_level,
                      )}`}
                    >
                      {document.confidentiality_level || "Internal"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-300">
                    {document.title || "Matter title unavailable"}
                  </p>
                    <p className="mt-4 text-xs text-slate-400">
                      Uploaded by {document.uploaded_by_name || "Unknown"} |{" "}
                      {formatDateTime(document.created_at)}
                    </p>
                  </Link>
                ))
            )}
          </div>
        </div>

        <div className="card-premium p-8">
          <p className="eyebrow">Portfolio Leaders</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Client portfolio</h2>

          <div className="mt-8 space-y-4">
            {clientPortfolio.length === 0 ? (
              <EmptyPanel message="No client portfolio data available." />
            ) : (
                clientPortfolio.map((client) => (
                  <Link
                    key={client.client_id}
                    to={`/clients/${client.client_id}`}
                    className="block rounded-3xl border border-white/10 bg-white/[0.03] p-5 smooth-transition hover:-translate-y-0.5 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                        {client.client_name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Last contact {formatDateTime(client.last_contact, "Not recorded")}
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="mt-1 text-primary" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Matters
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {client.matter_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Billed
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatCurrency(client.billed_total)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card-premium p-8">
          <p className="eyebrow">Team Spotlight</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">People in motion</h2>

          <div className="mt-8 space-y-4">
            {featuredPeople.length === 0 ? (
              <EmptyPanel message="No people data available." />
            ) : (
              featuredPeople.map((person) => (
                <div
                  key={person.employee_id}
                  className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(person.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{person.name}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getAccessTone(
                          person.access_level,
                        )}`}
                      >
                        {person.access_level || "Support Access"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {person.role_name || "Role pending"} |{" "}
                      {person.department_name || "Department pending"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Reports to {person.supervisor_name || "executive leadership"} |{" "}
                      {person.employment_type || "Full-Time"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-premium p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Access and Coverage</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Role map and staffing
              </h2>
            </div>
            <ShieldCheck className="text-primary" size={20} />
          </div>

          <div className="mt-8 space-y-4">
            {roleAccess.length === 0 ? (
              <EmptyPanel message="No access map data available." />
            ) : (
              roleAccess.map((role) => (
                <div
                  key={role.role_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{role.role_name}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Hierarchy level {role.hierarchy_level}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getAccessTone(
                        role.access_level,
                      )}`}
                    >
                      {role.access_level}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {truncate(role.permissions, 112)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="eyebrow">Department Coverage</p>
            <div className="mt-4 space-y-4">
              {departmentCoverage.length === 0 ? (
                <EmptyPanel message="No department coverage data available." />
              ) : (
                departmentCoverage.map((department, index) => {
                  const peakHeadcount = departmentCoverage[0]?.headcount || 1;
                  const width = Math.max((department.headcount / peakHeadcount) * 100, 18);

                  return (
                    <div key={department.name}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-200">{department.name}</span>
                        <span className="text-slate-400">{department.headcount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.05]">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${width}%`,
                            background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, #60A5FA)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {roleMix.map((role) => (
                <span
                  key={role.name}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                >
                  {role.name}: {role.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
