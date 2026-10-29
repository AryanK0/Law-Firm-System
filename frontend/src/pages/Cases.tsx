import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import { formatCaseCode, formatCurrency, formatDate, truncate } from "../lib/format";
import {
  createCase,
  getCases,
  getClients,
  getEmployees,
  type CaseDetailRecord,
  type CaseRecord,
  type ClientRecord,
  type EmployeeRecord,
} from "../services/api";

const caseStatuses = [
  "All",
  "Open",
  "Drafting",
  "Hearing Scheduled",
  "Negotiation",
  "Closed",
];

function mapDetailToRecord(detail: CaseDetailRecord): CaseRecord {
  return {
    case_id: detail.case_id,
    case_code: detail.case_code,
    title: detail.title,
    description: detail.description,
    case_type: detail.case_type,
    client_id: detail.client.client_id,
    client_name: detail.client.display_name,
    lead_partner_id: detail.lead_partner.employee_id,
    lead_partner_name: detail.lead_partner.name,
    lead_senior_id: detail.lead_senior.employee_id,
    lead_senior_name: detail.lead_senior.name,
    status: detail.status,
    confidentiality_level: detail.confidentiality_level,
    created_by: detail.created_by.employee_id,
    created_by_name: detail.created_by.name,
    start_date: detail.start_date,
    end_date: detail.end_date,
    team_size: detail.metrics.team_size,
    document_count: detail.metrics.document_count,
    billed_total: detail.metrics.billed_total,
    total_hours: detail.metrics.total_hours,
  };
}

export default function CasesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    case_code: "",
    title: "",
    description: "",
    client_id: "",
    case_type: "",
    lead_partner_id: "",
    lead_senior_id: "",
    status: "Open",
    confidentiality_level: "Internal",
    start_date: "",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([getCases(user.id), getClients(), getEmployees()])
      .then(([caseData, clientData, employeeData]) => {
        setCases(caseData);
        setClients(clientData);
        setEmployees(employeeData);
        setForm((current) => ({
          ...current,
          client_id: current.client_id || String(clientData[0]?.client_id ?? ""),
          lead_partner_id:
            current.lead_partner_id ||
            String(
              employeeData.find((employee) =>
                ["Managing Partner", "Partner"].includes(employee.role_name ?? ""),
              )?.employee_id ?? "",
            ),
          lead_senior_id:
            current.lead_senior_id ||
            String(
              employeeData.find((employee) =>
                ["Senior Associate", "Associate"].includes(
                  employee.role_name ?? "",
                ),
              )?.employee_id ?? "",
            ),
        }));
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const leadPartners = employees.filter((employee) =>
    ["Managing Partner", "Partner"].includes(employee.role_name ?? ""),
  );
  const leadSeniors = employees.filter((employee) =>
    ["Senior Associate", "Associate", "Special Counsel"].includes(
      employee.role_name ?? "",
    ),
  );

  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      const matchesSearch = [
        caseItem.title,
        caseItem.description,
        caseItem.client_name,
        caseItem.case_code,
        caseItem.status,
        caseItem.case_type,
        caseItem.lead_partner_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || caseItem.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cases, searchTerm, statusFilter]);

  // Aggregate KPI metrics
  const kpiStats = useMemo(() => {
    const totalMatters = cases.length;
    const activeHearings = cases.filter(
      (c) => c.status === "Hearing Scheduled",
    ).length;
    const totalBilled = cases.reduce((acc, c) => acc + (c.billed_total || 0), 0);
    const totalHours = cases.reduce((acc, c) => acc + (c.total_hours || 0), 0);
    return { totalMatters, activeHearings, totalBilled, totalHours };
  }, [cases]);

  const getStatusBadge = (statusValue: string | null) => {
    switch (statusValue) {
      case "Hearing Scheduled":
        return {
          pill: "border-amber-400/30 bg-amber-500/10 text-amber-300",
          dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
        };
      case "Open":
      case "Active":
        return {
          pill: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
          dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
        };
      case "Drafting":
      case "Negotiation":
        return {
          pill: "border-sky-400/30 bg-sky-500/10 text-sky-300",
          dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]",
        };
      case "Closed":
        return {
          pill: "border-slate-500/30 bg-slate-500/10 text-slate-400",
          dot: "bg-slate-400",
        };
      default:
        return {
          pill: "border-white/10 bg-white/5 text-slate-300",
          dot: "bg-slate-300",
        };
    }
  };

  const updateField = (name: string, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateCase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Matter title is required.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createCase({
        case_code: form.case_code || undefined,
        title: form.title,
        description: form.description || undefined,
        case_type: form.case_type || "General Practice",
        client_id: Number(form.client_id) || clients[0]?.client_id || 1,
        lead_partner_id: form.lead_partner_id
          ? Number(form.lead_partner_id)
          : undefined,
        lead_senior_id: form.lead_senior_id
          ? Number(form.lead_senior_id)
          : undefined,
        status: form.status,
        confidentiality_level: form.confidentiality_level,
        created_by: user.id,
        start_date: form.start_date || undefined,
      });

      setCases((current) => [mapDetailToRecord(created), ...current]);
      setMessage(`Successfully opened ${created.title || "new matter"}.`);
      setShowCreateForm(false);
      setForm((current) => ({
        ...current,
        case_code: "",
        title: "",
        description: "",
        case_type: "",
        status: "Open",
        confidentiality_level: "Internal",
        start_date: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create case.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            <Scale size={14} />
            <span>Practice Management & Litigation</span>
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight font-heading premium-gradient-text md:text-5xl">
            Active Matters
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
            Browse corporate, dispute, and regulatory matters with live OCC concurrency,
            ethical walls, and distributed document locking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="page-button-primary shrink-0 group"
        >
          <Plus size={18} className="transition-transform group-hover:rotate-90 duration-300" />
          <span>Register New Matter</span>
        </button>
      </div>

      {/* Persona Access & Ethical Wall Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/20 bg-sky-950/20 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
            <Shield size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{user.name}</span>
              <span className="rounded-md bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-300 border border-sky-400/20">
                {user.role} • Rank {user.hierarchy} ({user.accessLabel})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.id === 1
                ? "Executive Privilege: Complete firm-wide access to all corporate and litigation matters."
                : user.id === 2
                ? "Partner Authority: Filtered to high-stakes litigation matters where assigned as Lead Partner."
                : user.id === 5
                ? "Senior Counsel: Filtered to active dispute arbitration and defense matters with lead drafting clearance."
                : user.id === 6
                ? "Associate Access: Filtered to staffed discovery research and chancery motions under partner supervision."
                : user.id === 7
                ? "Support Access: Partitioned to assigned deposition and filing coordination matters (ABA Model Rule 1.6)."
                : "Systems Administration: Technical oversight, audit logging, and DBMS infrastructure access."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Authorized Matters:</span>
          <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-400/30">
            {cases.length} Visible
          </span>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card-premium p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Matters
            </span>
            <div className="icon-accent p-2 rounded-xl">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">
              {loading ? "..." : kpiStats.totalMatters}
            </span>
            <span className="text-xs text-sky-400 font-medium">In Workspace</span>
          </div>
        </div>

        <div className="card-premium p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Hearings
            </span>
            <div className="p-2 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-400">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">
              {loading ? "..." : kpiStats.activeHearings}
            </span>
            <span className="text-xs text-amber-400 font-medium">Scheduled</span>
          </div>
        </div>

        <div className="card-premium p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Billed Ledger
            </span>
            <div className="p-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">
              {loading ? "..." : formatCurrency(kpiStats.totalBilled)}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Tracked</span>
          </div>
        </div>

        <div className="card-premium p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Billable Hours
            </span>
            <div className="p-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">
              {loading ? "..." : `${kpiStats.totalHours.toLocaleString()}h`}
            </span>
            <span className="text-xs text-indigo-400 font-medium">Recorded</span>
          </div>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="card-premium p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, client, matter code, or partner..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-sky-400/50 focus:bg-white/[0.05]"
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Filter:
          </span>
          {caseStatuses.map((statusName) => {
            const isActive = statusFilter === statusName;
            return (
              <button
                key={statusName}
                onClick={() => setStatusFilter(statusName)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? "bg-sky-400 text-slate-950 font-semibold shadow-sm shadow-sky-400/30"
                    : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {statusName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {message ? (
        <div className="card-premium p-4 border-emerald-400/30 bg-emerald-500/[0.05] flex items-center justify-between text-sm text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="card-premium p-5 border-red-500/30 bg-red-500/[0.05] flex items-center justify-between text-sm text-red-300">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-200">Unable to load matters</p>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="page-button-secondary text-xs px-3 py-1.5 shrink-0"
          >
            Retry Query
          </button>
        </div>
      ) : null}

      {/* New Matter Modal/Form */}
      {showCreateForm ? (
        <form className="card-premium p-6 border-sky-400/30 shadow-2xl" onSubmit={handleCreateCase}>
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Register Matter Dossier</h2>
              <p className="text-xs text-slate-400">Matter registered under partner clearance: {user.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Matter Code</label>
              <input
                value={form.case_code}
                onChange={(event) => updateField("case_code", event.target.value)}
                className="page-input"
                placeholder="e.g. MATTER-2026-099"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Matter Title *</label>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="page-input"
                placeholder="e.g. Wayne Tech IP Acquisition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Client Organization *</label>
              <select
                value={form.client_id}
                onChange={(event) => updateField("client_id", event.target.value)}
                className="page-select w-full"
              >
                <option value="">Select corporate client</option>
                {clients.map((client) => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.organization || client.name || `Client #${client.client_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Practice Area</label>
              <input
                value={form.case_type}
                onChange={(event) => updateField("case_type", event.target.value)}
                className="page-input"
                placeholder="e.g. Corporate M&A, Antitrust"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Lead Partner</label>
              <select
                value={form.lead_partner_id}
                onChange={(event) => updateField("lead_partner_id", event.target.value)}
                className="page-select w-full"
              >
                <option value="">Select partner</option>
                {leadPartners.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.name} ({employee.role_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Lead Senior Associate</label>
              <select
                value={form.lead_senior_id}
                onChange={(event) => updateField("lead_senior_id", event.target.value)}
                className="page-select w-full"
              >
                <option value="">Select associate</option>
                {leadSeniors.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Confidentiality Tier</label>
              <select
                value={form.confidentiality_level}
                onChange={(event) => updateField("confidentiality_level", event.target.value)}
                className="page-select w-full"
              >
                <option value="Internal">Internal (Hierarchy 5+)</option>
                <option value="Confidential">Confidential (Hierarchy 3+)</option>
                <option value="Restricted">Restricted (Assigned Team Only)</option>
                <option value="Strictly Confidential">Strictly Confidential (Partners Only)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => updateField("start_date", event.target.value)}
                className="page-input"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Executive Matter Summary</label>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="page-textarea"
                placeholder="Provide statement of claim, core dispute points, or advisory scope..."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="page-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="page-button-primary disabled:opacity-60"
            >
              {submitting ? "Opening Matter..." : "Confirm & Open Matter"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Cases Grid / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-premium p-6 shimmer-skeleton h-44 rounded-2xl" />
            ))}
          </div>
        ) : filteredCases.length > 0 ? (
          filteredCases.map((caseItem) => {
            const badge = getStatusBadge(caseItem.status);
            return (
              <div
                key={caseItem.case_id}
                onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                className="card-premium p-6 text-left cursor-pointer group hover:border-sky-400/40 relative overflow-hidden"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Top tags row */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold tracking-wider px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-400/20">
                        {formatCaseCode(caseItem.case_code, `MATTER-${caseItem.case_id}`)}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium border ${badge.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        <span>{caseItem.status || "Open"}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-white/5 text-slate-300 border border-white/10">
                        <Shield size={11} className="text-slate-400" />
                        <span>{caseItem.confidentiality_level || "Internal"}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold font-heading text-white group-hover:text-sky-300 transition-colors">
                      {caseItem.title || "Untitled Matter"}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                      {caseItem.description || "No formal brief documented."}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-sky-400" />
                        <span className="text-slate-300 font-medium">
                          {caseItem.client_name || "General Client"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scale size={14} className="text-indigo-400" />
                        <span>{caseItem.case_type || "General Practice"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-500" />
                        <span>Opened {formatDate(caseItem.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Lead:</span>
                        <span className="text-slate-300 font-medium">
                          {caseItem.lead_partner_name || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Team metrics panel */}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 lg:w-64 shrink-0">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
                        <Users size={12} />
                        <span>Counsel</span>
                      </div>
                      <p className="mt-1 text-lg font-bold font-heading text-white">
                        {caseItem.team_size ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
                        <FileText size={12} />
                        <span>Documents</span>
                      </div>
                      <p className="mt-1 text-lg font-bold font-heading text-white">
                        {caseItem.document_count ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        Billed
                      </span>
                      <p className="mt-1 text-base font-bold font-heading text-emerald-400">
                        {formatCurrency(caseItem.billed_total)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        Hours
                      </span>
                      <p className="mt-1 text-base font-bold font-heading text-sky-400">
                        {caseItem.total_hours ?? 0}h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer action link */}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-slate-500">
                    SOC-2 Encrypted • OCC Versioned
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                    <span>Open Case File</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card-premium p-12 text-center">
            <Scale className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-white">No matching matters located</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              We couldn't find any matters matching your filter or search query. Try broadening your keywords.
            </p>
            {searchTerm || statusFilter !== "All" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                }}
                className="page-button-secondary text-xs mt-4 px-4 py-2"
              >
                Clear All Filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
