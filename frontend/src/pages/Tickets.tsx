import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  LifeBuoy,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";

import { useAuth } from "../content/AuthContext";
import { formatDateTime } from "../lib/format";
import {
  createTicket,
  getEmployees,
  getTickets,
  resolveTicket,
  type EmployeeRecord,
  type TicketRecord,
} from "../services/api";

type StatusFilter = "ALL" | "Open" | "In Progress" | "Resolved";

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    priority: "Medium",
    assigned_to: "",
    resolution_deadline: "",
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getTickets(), getEmployees()])
      .then(([ticketData, employeeData]) => {
        setTickets(ticketData);
        setEmployees(employeeData);
        setForm((current) => ({
          ...current,
          assigned_to:
            current.assigned_to ||
            String(
              employeeData.find((employee) => employee.role_name === "IT Admin")
                ?.employee_id ?? "",
            ),
        }));
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "Open").length,
    [tickets],
  );
  const inProgressCount = useMemo(
    () => tickets.filter((t) => t.status === "In Progress").length,
    [tickets],
  );
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === "Resolved").length,
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter !== "ALL" && ticket.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const searchable = [
        ticket.description,
        ticket.priority,
        ticket.status,
        `TCK-${String(ticket.ticket_id).padStart(3, "0")}`,
        `#${ticket.ticket_id}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(searchQuery.toLowerCase().trim());
    });
  }, [tickets, statusFilter, searchQuery]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canResolveTicket = (ticket: TicketRecord) =>
    ticket.status !== "Resolved" &&
    (user.role === "IT Admin" || ticket.assigned_to === user.id);

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case "Critical":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Critical
          </span>
        );
      case "High":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            High
          </span>
        );
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Medium
          </span>
        );
      case "Low":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
            {priority || "Standard"}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Open":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
            <AlertCircle size={13} className="text-red-400" />
            Open
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300">
            <Clock size={13} className="text-sky-400" />
            In Progress
          </span>
        );
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-400" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.description.trim()) {
      setError("Please add a detailed description of the issue.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createTicket({
        raised_by: user.id,
        description: form.description.trim(),
        priority: form.priority,
        status: "Open",
        assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
        resolution_deadline: form.resolution_deadline || undefined,
      });

      setTickets((current) => [created, ...current]);
      setMessage(`Support ticket #${created.ticket_id} escalated successfully.`);
      setShowCreateModal(false);
      setForm((current) => ({
        ...current,
        description: "",
        priority: "Medium",
        resolution_deadline: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveTicket = async (ticketId: number) => {
    setError(null);
    setMessage(null);
    setResolvingTicketId(ticketId);

    try {
      const resolved = await resolveTicket(ticketId, { resolved_by: user.id });
      setTickets((current) =>
        current.map((ticket) => (ticket.ticket_id === ticketId ? resolved : ticket)),
      );
      setMessage(`Ticket #${ticketId} marked as Resolved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve ticket.");
    } finally {
      setResolvingTicketId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <LifeBuoy size={13} />
              Internal Operations & Desk
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight font-heading text-foreground">
            Support & Escalations
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            System issue reporting, role delegations, infrastructure requests, and resolution tracking.
          </p>
        </div>

        <button
          id="btn-raise-ticket"
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-luminous inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold self-start md:self-auto"
        >
          <Plus size={16} />
          Raise Support Ticket
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-white">{tickets.length}</span>
            <LifeBuoy size={18} className="text-sky-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Firm tickets recorded</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Escalations</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-red-400">{openCount}</span>
            <AlertCircle size={18} className="text-red-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Awaiting engineering action</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Progress</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-sky-300">{inProgressCount}</span>
            <Clock size={18} className="text-sky-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Currently being addressed</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolved</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-emerald-300">{resolvedCount}</span>
            <CheckCircle2 size={18} className="text-emerald-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 100}% resolution rate
          </p>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="input-search-tickets"
            type="text"
            placeholder="Search by ticket summary, priority, status, or TCK ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-9 text-sm text-foreground placeholder-slate-500 backdrop-blur-md transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/60 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "ALL"
                ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("Open")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "Open"
                ? "bg-red-500/20 text-red-300 shadow-sm border border-red-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("In Progress")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "In Progress"
                ? "bg-sky-500/20 text-sky-300 shadow-sm border border-sky-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("Resolved")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "Resolved"
                ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="skeleton-shimmer h-4 w-32 rounded" />
                <div className="skeleton-shimmer h-6 w-24 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
              <div className="flex items-center gap-4">
                <div className="skeleton-shimmer h-4 w-28 rounded" />
                <div className="skeleton-shimmer h-4 w-28 rounded" />
              </div>
            </div>
          ))
        ) : filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => {
            const assignedEmployee = employees.find(
              (e) => e.employee_id === ticket.assigned_to,
            );
            const canResolve = canResolveTicket(ticket);

            return (
              <div
                key={ticket.ticket_id}
                className="card-premium group relative p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_4px_24px_rgba(6,182,212,0.08)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 flex-1">
                    {/* Top Row: ID, Priority, Status */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        TCK-{String(ticket.ticket_id).padStart(3, "0")}
                      </span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-slate-500">
                        Raised {formatDateTime(ticket.created_at)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-base font-medium text-slate-100 leading-relaxed">
                      {ticket.description}
                    </p>

                    {/* Metadata: Assignee, Deadline */}
                    <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={14} className="text-slate-500" />
                        <span>Assigned to:</span>
                        <span className="font-semibold text-slate-200">
                          {assignedEmployee?.name || "Unassigned"}
                        </span>
                        {assignedEmployee?.role_name && (
                          <span className="text-[11px] text-slate-500">
                            ({assignedEmployee.role_name})
                          </span>
                        )}
                      </div>

                      {ticket.resolution_deadline && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-500" />
                          <span>Deadline:</span>
                          <span className="font-medium text-amber-300/90">
                            {formatDateTime(ticket.resolution_deadline)}
                          </span>
                        </div>
                      )}

                      {ticket.resolved_at && (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 size={14} />
                          <span>Resolved at: {formatDateTime(ticket.resolved_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolve Action Button */}
                  {canResolve && (
                    <button
                      type="button"
                      disabled={resolvingTicketId === ticket.ticket_id}
                      onClick={() => handleResolveTicket(ticket.ticket_id)}
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {resolvingTicketId === ticket.ticket_id ? "Resolving..." : "Mark as Resolved"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card-premium py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <LifeBuoy size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">No tickets found</h3>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery
                ? `No support tickets matching "${searchQuery}".`
                : "No tickets recorded under this filter status."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Raise Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 className="text-xl font-bold font-heading text-white">Raise Support Ticket</h2>
                  <p className="text-xs text-slate-400">Submit an operational issue or escalation request</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Issue Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the technical or operational incident, affected matter IDs, or permission requirement..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Priority Tier
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-foreground focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Low">Low - Informational</option>
                    <option value="Medium">Medium - Normal Workflow</option>
                    <option value="High">High - Impending Deadline</option>
                    <option value="Critical">Critical - Production Blocker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Assigned Member
                  </label>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-foreground focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.name} ({emp.role_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Resolution Target Deadline
                </label>
                <input
                  type="datetime-local"
                  value={form.resolution_deadline}
                  onChange={(e) => updateField("resolution_deadline", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-foreground focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-luminous px-5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
