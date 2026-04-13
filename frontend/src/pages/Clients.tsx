import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import {
  createClient,
  getCases,
  getClients,
  type CaseRecord,
  type ClientRecord,
} from "../services/api";

export default function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    organization: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    let active = true;

    Promise.all([getClients(), getCases(user.id)])
      .then(([clientData, caseData]) => {
        if (!active) {
          return;
        }

        setClients(clientData);
        setCases(caseData);
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

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        [
          client.name,
          client.organization,
          client.contact_info,
          `C${client.client_id}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [clients, searchTerm],
  );

  const caseCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const caseItem of cases) {
      if (!caseItem.client_id) {
        continue;
      }

      counts.set(caseItem.client_id, (counts.get(caseItem.client_id) ?? 0) + 1);
    }

    return counts;
  }, [cases]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.name.trim() && !form.organization.trim()) {
      setError("Provide at least a client name or organization.");
      return;
    }

    setSubmitting(true);

    try {
      const contactInfo = [form.email.trim(), form.phone.trim()]
        .filter(Boolean)
        .join(" | ");

      const created = await createClient({
        name: form.name.trim() || undefined,
        organization: form.organization.trim() || undefined,
        contact_info: contactInfo || undefined,
      });

      setClients((current) => [created, ...current]);
      setMessage(
        `Added ${created.organization || created.name || `client #${created.client_id}`}.`,
      );
      setShowCreateForm(false);
      setForm({ name: "", organization: "", email: "", phone: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add client.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Clients</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Manage your client relationships and contacts
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
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
          Add Client
        </button>
      </div>

      {showCreateForm ? (
        <form className="mb-8 card-premium p-6" onSubmit={handleCreateClient}>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">New Client</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="page-input"
              placeholder="Client name"
            />
            <input
              value={form.organization}
              onChange={(event) => updateField("organization", event.target.value)}
              className="page-input"
              placeholder="Organization"
            />
            <input
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="page-input"
              placeholder="Email"
            />
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="page-input"
              placeholder="Phone"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="page-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Save Client"}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="card-premium p-6 text-sm text-muted-foreground">
            Loading clients...
          </div>
        ) : (
          filteredClients.map((client) => {
            const contactParts = (client.contact_info ?? "").split("|").map((part) => part.trim());
            const email =
              contactParts.find((part) => part.includes("@")) ?? "No email on file";
            const phone =
              contactParts.find((part) => !part.includes("@")) ?? "No phone on file";

            return (
              <div key={client.client_id} className="card-premium p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {client.organization || client.name || "Unnamed client"}
                    </h3>
                    <p className="text-xs font-medium text-primary">
                      {String(client.client_id).padStart(3, "0")}
                    </p>
                  </div>
                  <span className="rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-primary">
                    {client.organization ? "Corporate" : "Individual"}
                  </span>
                </div>

                <div className="space-y-3 border-t border-white/5 pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{phone}</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Active Cases
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {caseCounts.get(client.client_id) ?? 0}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/clients/${client.client_id}`)}
                  className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-primary smooth-transition hover:bg-white/5"
                >
                  View Details
                </button>
              </div>
            );
          })
        )}
      </div>

      {!loading && filteredClients.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-base font-light text-muted-foreground">
            No clients found matching your search.
          </p>
        </div>
      ) : null}
    </div>
  );
}
