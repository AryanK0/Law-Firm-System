import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Plus } from "lucide-react";

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

const statuses = ["Open", "In Progress", "Resolved"] as const;

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    priority: "Medium",
    assigned_to: "",
    resolution_deadline: "",
  });

  useEffect(() => {
    let active = true;

    Promise.all([getTickets(), getEmployees()])
      .then(([ticketData, employeeData]) => {
        if (!active) {
          return;
        }

        setTickets(ticketData);
        setEmployees(employeeData);
        setForm((current) => ({
          ...current,
          assigned_to:
            current.assigned_to ||
            String(
              employeeData.find((employee) => employee.role_name === "IT")
                ?.employee_id ?? "",
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
  }, []);

  const filteredTickets = useMemo(
    () =>
      filterStatus ? tickets.filter((ticket) => ticket.status === filterStatus) : tickets,
    [filterStatus, tickets],
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canResolveTicket = (ticket: TicketRecord) =>
    ticket.status !== "Resolved" &&
    (user.role === "IT" || user.hierarchy <= 2 || ticket.assigned_to_name === user.name);

  const handleResolveTicket = async (ticketId: number) => {
    setError(null);
    setMessage(null);

    try {
      const resolved = await resolveTicket(ticketId, user.id);
      setTickets((current) =>
        current.map((ticket) => (ticket.ticket_id === ticketId ? resolved : ticket)),
      );
      setMessage(`Resolved ticket #${ticketId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve ticket.");
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "Critical":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "High":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Medium":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Low":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "bg-secondary/10 text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "Open":
        return <AlertCircle size={16} />;
      case "In Progress":
        return <Clock size={16} />;
      case "Resolved":
        return <CheckCircle size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Open":
        return "bg-red-500/10 text-red-400";
      case "In Progress":
        return "bg-blue-500/10 text-blue-400";
      case "Resolved":
        return "bg-green-500/10 text-green-400";
      default:
        return "bg-secondary/10 text-secondary-foreground";
    }
  };

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.description.trim()) {
      setError("Add a ticket description before saving.");
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
      setMessage(`Raised ticket #${created.ticket_id} successfully.`);
      setShowCreateForm(false);
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

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Support Tickets
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Track and manage support issues
        </p>
      </div>

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="page-button-primary"
        >
          <Plus size={18} />
          Raise Ticket
        </button>
      </div>

      {showCreateForm ? (
        <form className="mb-8 card-premium p-6" onSubmit={handleCreateTicket}>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">New Ticket</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="page-textarea"
              placeholder="Describe the issue"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <select
                value={form.priority}
                onChange={(event) => updateField("priority", event.target.value)}
                className="page-select"
              >
                {["Low", "Medium", "High"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              <select
                value={form.assigned_to}
                onChange={(event) => updateField("assigned_to", event.target.value)}
                className="page-select"
              >
                <option value="">Assign to</option>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={form.resolution_deadline}
                onChange={(event) =>
                  updateField("resolution_deadline", event.target.value)
                }
                className="page-input"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="page-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Ticket"}
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

      <div className="mb-8 overflow-x-auto border-b border-white/5 pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus(null)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium smooth-transition ${
              filterStatus === null
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Tickets
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium smooth-transition ${
                filterStatus === status
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="card-premium p-6 text-sm text-muted-foreground">
            Loading tickets...
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.ticket_id} className="card-premium p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-primary">
                      #{ticket.ticket_id}
                    </span>
                    <h3 className="text-base font-bold text-foreground">
                      {ticket.description}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Assigned to: {ticket.assigned_to_name || "Unassigned"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canResolveTicket(ticket) ? (
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(ticket.ticket_id)}
                      className="page-button-secondary"
                    >
                      Resolve
                    </button>
                  ) : null}
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium ${getPriorityColor(
                      ticket.priority,
                    )}`}
                  >
                    {ticket.priority || "Unknown"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${getStatusColor(
                      ticket.status,
                    )}`}
                  >
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDateTime(ticket.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && filteredTickets.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-base text-muted-foreground">
            No tickets found with the selected filter.
          </p>
        </div>
      ) : null}

      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card-premium p-6">
          <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {tickets.filter((ticket) => ticket.status === "Open").length}
          </p>
        </div>
        <div className="card-premium p-6">
          <p className="text-sm font-medium text-muted-foreground">In Progress</p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {tickets.filter((ticket) => ticket.status === "In Progress").length}
          </p>
        </div>
        <div className="card-premium p-6">
          <p className="text-sm font-medium text-muted-foreground">Resolved</p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {tickets.filter((ticket) => ticket.status === "Resolved").length}
          </p>
        </div>
      </div>
    </div>
  );
}
