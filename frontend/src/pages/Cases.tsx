import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
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

  useEffect(() => {
    let active = true;

    Promise.all([getCases(user.id), getClients(), getEmployees()])
      .then(([caseData, clientData, employeeData]) => {
        if (!active) {
          return;
        }

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
  }, [user.id]);

  const leadPartners = employees.filter((employee) =>
    ["Managing Partner", "Partner"].includes(employee.role_name ?? ""),
  );
  const leadSeniors = employees.filter((employee) =>
    ["Senior Associate", "Associate", "Special Counsel"].includes(
      employee.role_name ?? "",
    ),
  );

  const filteredCases = useMemo(
    () =>
      cases.filter((caseItem) =>
        [
          caseItem.title,
          caseItem.description,
          caseItem.client_name,
          caseItem.case_code,
          caseItem.status,
          caseItem.case_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [cases, searchTerm],
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Open":
        return "bg-primary/10 text-primary";
      case "Drafting":
        return "bg-amber-500/10 text-amber-400";
      case "Hearing Scheduled":
        return "bg-blue-500/10 text-blue-400";
      case "Negotiation":
        return "bg-cyan-500/10 text-cyan-400";
      case "Closed":
        return "bg-muted/20 text-muted-foreground";
      default:
        return "bg-secondary/10 text-secondary-foreground";
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.title.trim() || !form.client_id || !form.description.trim()) {
      setError("Provide a matter title, description, and client before creating a case.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createCase({
        case_code: form.case_code || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        client_id: Number(form.client_id),
        case_type: form.case_type || undefined,
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
      setMessage(`Created ${created.title || "new case"} successfully.`);
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
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Cases</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Browse assigned matters, open a full case file, and register new work.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cases, clients, IDs..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full card-premium py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground smooth-transition focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="page-button-primary"
        >
          <Plus size={18} />
          Create Case
        </button>
      </div>

      {showCreateForm ? (
        <form className="mb-8 card-premium p-6" onSubmit={handleCreateCase}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">New Case</h2>
            <span className="text-xs text-muted-foreground">Created by {user.name}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={form.case_code}
              onChange={(event) => updateField("case_code", event.target.value)}
              className="page-input"
              placeholder="Case code"
            />
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="page-input"
              placeholder="Matter title"
            />
            <select
              value={form.client_id}
              onChange={(event) => updateField("client_id", event.target.value)}
              className="page-select"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.organization || client.name || `Client #${client.client_id}`}
                </option>
              ))}
            </select>
            <input
              value={form.case_type}
              onChange={(event) => updateField("case_type", event.target.value)}
              className="page-input"
              placeholder="Case type"
            />
            <select
              value={form.lead_partner_id}
              onChange={(event) => updateField("lead_partner_id", event.target.value)}
              className="page-select"
            >
              <option value="">Lead partner</option>
              {leadPartners.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <select
              value={form.lead_senior_id}
              onChange={(event) => updateField("lead_senior_id", event.target.value)}
              className="page-select"
            >
              <option value="">Lead senior</option>
              {leadSeniors.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              className="page-select"
            >
              {caseStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={form.confidentiality_level}
              onChange={(event) =>
                updateField("confidentiality_level", event.target.value)
              }
              className="page-select"
            >
              {["Internal", "Confidential", "Highly Confidential"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.start_date}
              onChange={(event) => updateField("start_date", event.target.value)}
              className="page-input xl:col-span-1"
            />
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="page-textarea md:col-span-2 xl:col-span-3"
              placeholder="Detailed matter description"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="page-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Save Case"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="page-button-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <div className="mb-6 card-premium p-4 text-sm text-primary">{message}</div>
      ) : null}

      {error ? (
        <div className="mb-6 card-premium p-4 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="card-premium p-6 text-sm text-muted-foreground">
            Loading cases...
          </div>
        ) : (
          filteredCases.map((caseItem) => (
            <button
              key={caseItem.case_id}
              type="button"
              onClick={() => navigate(`/cases/${caseItem.case_id}`)}
              className="card-premium p-6 text-left smooth-transition hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-primary">
                      {formatCaseCode(caseItem.case_code, `Matter #${caseItem.case_id}`)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        caseItem.status,
                      )}`}
                    >
                      {caseItem.status || "Unknown"}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {caseItem.confidentiality_level || "Internal"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold text-foreground">
                    {caseItem.title || "Untitled matter"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {truncate(caseItem.description, 180) || "No description available."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>{caseItem.client_name || "Unknown client"}</span>
                    <span>{caseItem.case_type || "General"}</span>
                    <span>Opened {formatDate(caseItem.start_date)}</span>
                    <span>Lead {caseItem.lead_partner_name || "Unassigned"}</span>
                  </div>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:w-[260px]">
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Team
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {caseItem.team_size ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Docs
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {caseItem.document_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Billing
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(caseItem.billed_total)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Hours
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {caseItem.total_hours ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                Open full case file
                <ArrowRight size={16} />
              </div>
            </button>
          ))
        )}
      </div>

      {!loading && filteredCases.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-base font-light text-muted-foreground">
            No cases found matching your search.
          </p>
        </div>
      ) : null}
    </div>
  );
}
