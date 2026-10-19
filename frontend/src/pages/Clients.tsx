import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import {
  createClient,
  getCases,
  getClients,
  type CaseRecord,
  type ClientRecord,
} from "../services/api";

type ClientTypeFilter = "all" | "corporate" | "individual";

export default function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientTypeFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    organization: "",
    email: "",
    phone: "",
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getClients(), getCases(user.id)])
      .then(([clientData, caseData]) => {
        setClients(clientData);
        setCases(caseData);
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
  }, [user.id]);

  const caseCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const caseItem of cases) {
      if (caseItem.client_id) {
        counts.set(caseItem.client_id, (counts.get(caseItem.client_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [cases]);

  const corporateCount = useMemo(
    () => clients.filter((c) => Boolean(c.organization && c.organization.trim())).length,
    [clients],
  );
  const individualCount = useMemo(
    () => clients.filter((c) => !c.organization || !c.organization.trim()).length,
    [clients],
  );
  const totalMattersLinked = useMemo(
    () => clients.reduce((acc, c) => acc + (caseCounts.get(c.client_id) ?? 0), 0),
    [clients, caseCounts],
  );

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const isCorporate = Boolean(client.organization && client.organization.trim());
      if (typeFilter === "corporate" && !isCorporate) return false;
      if (typeFilter === "individual" && isCorporate) return false;

      if (!searchTerm.trim()) return true;

      const searchable = [
        client.name,
        client.organization,
        client.contact_info,
        `CLI-${String(client.client_id).padStart(3, "0")}`,
        `C${client.client_id}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(searchTerm.toLowerCase().trim());
    });
  }, [clients, typeFilter, searchTerm]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.name.trim() && !form.organization.trim()) {
      setError("Please provide either a client contact name or organization name.");
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
        `Successfully onboarded ${created.organization || created.name || `Client #${created.client_id}`}.`,
      );
      setShowCreateModal(false);
      setForm({ name: "", organization: "", email: "", phone: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add client.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <Users size={13} />
              Client Relationship Management
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight font-heading text-foreground">
            Clients & Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Enterprise CRM directory, contact points, matter affiliations, and retainer registries.
          </p>
        </div>

        <button
          id="btn-add-client"
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-luminous inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold self-start md:self-auto"
        >
          <Plus size={16} />
          Onboard New Client
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-white">{clients.length}</span>
            <Users size={18} className="text-sky-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Active client ledgers</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Corporate Entities</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-cyan-300">{corporateCount}</span>
            <Building2 size={18} className="text-cyan-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Enterprise accounts</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Individual Clients</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-emerald-300">{individualCount}</span>
            <User size={18} className="text-emerald-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Private retainers</p>
        </div>

        <div className="stat-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Linked Matters</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-indigo-300">{totalMattersLinked}</span>
            <Briefcase size={18} className="text-indigo-400/60" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Across firm roster</p>
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
            id="input-search-clients"
            type="text"
            placeholder="Search by client name, company, email, or CLI ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-9 text-sm text-foreground placeholder-slate-500 backdrop-blur-md transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/60 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              typeFilter === "all"
                ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Accounts ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("corporate")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              typeFilter === "corporate"
                ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Corporate ({corporateCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("individual")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              typeFilter === "individual"
                ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Individual ({individualCount})
          </button>
        </div>
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-premium p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-shimmer h-3 w-16 rounded" />
                </div>
                <div className="skeleton-shimmer h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="skeleton-shimmer h-3 w-48 rounded" />
                <div className="skeleton-shimmer h-3 w-36 rounded" />
              </div>
              <div className="skeleton-shimmer h-9 w-full rounded-xl" />
            </div>
          ))
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const isCorporate = Boolean(client.organization && client.organization.trim());
            const contactParts = (client.contact_info ?? "").split("|").map((p) => p.trim());
            const email = contactParts.find((p) => p.includes("@")) ?? null;
            const phone = contactParts.find((p) => !p.includes("@")) ?? null;
            const activeMattersCount = caseCounts.get(client.client_id) ?? 0;

            return (
              <div
                key={client.client_id}
                className="card-premium group relative flex flex-col justify-between p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_8px_30px_rgba(6,182,212,0.12)]"
              >
                <div>
                  {/* Top Row: Type and ID */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isCorporate
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isCorporate ? <Building2 size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold font-heading text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {client.organization || client.name || "Unnamed Client"}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400">
                          CLI-{String(client.client_id).padStart(3, "0")}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCorporate
                          ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                      }`}
                    >
                      {isCorporate ? "Corporate" : "Individual"}
                    </span>
                  </div>

                  {/* Primary Contact (if corporate) */}
                  {isCorporate && client.name && (
                    <div className="mt-3 text-xs text-slate-300">
                      <span className="text-slate-500">Contact:</span>{" "}
                      <span className="font-medium text-slate-200">{client.name}</span>
                    </div>
                  )}

                  {/* Contact Info Rows */}
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail size={13} className="shrink-0 text-slate-500" />
                      <span className="truncate">{email || "No email on record"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={13} className="shrink-0 text-slate-500" />
                      <span className="truncate">{phone || "No phone on record"}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Active Matters & Details CTA */}
                <div className="mt-6 border-t border-white/5 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-400">Matters:</span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-bold text-cyan-300">
                      {activeMattersCount}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${client.client_id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    View Account
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <Users size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">No clients found</h3>
            <p className="mt-1 text-sm text-slate-400">
              {searchTerm
                ? `No client accounts matching "${searchTerm}". Try a different search term.`
                : "No clients registered under this category."}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Onboard Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 className="text-xl font-bold font-heading text-white">Onboard New Client</h2>
                  <p className="text-xs text-slate-400">Create an institutional or private client record</p>
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

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Client / Representative Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Organization / Entity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Logistics Inc. (Leave empty if individual)"
                  value={form.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="legal@entity.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2831"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
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
                  {submitting ? "Onboarding..." : "Register Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
