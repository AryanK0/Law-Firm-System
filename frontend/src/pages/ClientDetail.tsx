import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import { formatCaseCode, formatCurrency, formatDate, truncate } from "../lib/format";
import { getCases, getClients, type CaseRecord, type ClientRecord } from "../services/api";

function splitContactInfo(contactInfo: string | null) {
  const parts = (contactInfo ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    email: parts.find((part) => part.includes("@")) ?? "No email on file",
    phone: parts.find((part) => !part.includes("@")) ?? "No phone on file",
  };
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const parsedClientId = Number(clientId);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(parsedClientId)) {
      setError("Invalid client id.");
      setLoading(false);
      return;
    }

    let active = true;

    Promise.all([getClients(), getCases(user.id)])
      .then(([clientData, caseData]) => {
        if (!active) {
          return;
        }

        const matchedClient = clientData.find((item) => item.client_id === parsedClientId) ?? null;
        if (!matchedClient) {
          setError("Client not found.");
          setClient(null);
          setCases([]);
          return;
        }

        setClient(matchedClient);
        setCases(caseData.filter((item) => item.client_id === parsedClientId));
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
  }, [parsedClientId, user.id]);

  const contact = useMemo(() => splitContactInfo(client?.contact_info ?? null), [client]);
  const totalBilling = useMemo(
    () => cases.reduce((sum, item) => sum + (item.billed_total ?? 0), 0),
    [cases],
  );

  if (!Number.isFinite(parsedClientId)) {
    return <div className="card-premium p-6 text-sm text-red-300">Invalid client id.</div>;
  }

  if (loading) {
    return (
      <div className="card-premium p-6 text-sm text-muted-foreground">
        Loading client detail...
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft size={16} />
          Back to clients
        </Link>
        <div className="card-premium p-6 text-sm text-red-300">{error || "Client not found."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft size={16} />
        Back to clients
      </Link>

      <section className="card-premium p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-primary">
                Client #{String(client.client_id).padStart(3, "0")}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                {client.organization ? "Corporate" : "Individual"}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {client.organization || client.name || "Unnamed client"}
            </h1>

            {client.organization && client.name ? (
              <p className="mt-3 text-base text-slate-300">Primary contact: {client.name}</p>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Email</p>
                <p className="mt-2 text-sm text-foreground">{contact.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Phone</p>
                <p className="mt-2 text-sm text-foreground">{contact.phone}</p>
              </div>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Visible Matters</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{cases.length}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Visible Billing</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalBilling)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card-premium p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Matter Portfolio</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Client matters</h2>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
            {cases.length} visible
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {cases.length ? (
            cases.map((caseItem) => (
              <Link
                key={caseItem.case_id}
                to={`/cases/${caseItem.case_id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 smooth-transition hover:-translate-y-0.5 hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {formatCaseCode(caseItem.case_code, `Matter #${caseItem.case_id}`)}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {caseItem.status || "Unknown"}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {caseItem.case_type || "General"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {caseItem.title || "Untitled matter"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {truncate(caseItem.description, 180) || "No description available."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Opened {formatDate(caseItem.start_date)}</span>
                      <span>Lead {caseItem.lead_partner_name || "Unassigned"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    Open case
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">
              No visible matters for this client in your current access scope.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
