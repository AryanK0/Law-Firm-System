import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  CheckCircle2,
  Download,
  FileCode,
  FileText,
  Gavel,
  Plus,
  ShieldCheck,
  UserX,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import { formatCaseCode, formatCurrency, formatDate, formatDateTime } from "../lib/format";
import {
  getCaseBilling,
  getCaseDetail,
  getCaseDocuments,
  getDocumentDownloadUrl,
  getCaseStatusHistory,
  getCaseTeam,
  closeCase,
  getLedesInvoice,
  getLedesDownloadUrl,
  getUtbmsCodes,
  getCaseAdverseParties,
  addCaseAdverseParty,
  type CaseBillingResponse,
  type CaseDetailRecord,
  type CaseDocumentsResponse,
  type CaseStatusHistoryResponse,
  type CaseTeamResponse,
  type LedesInvoiceResponse,
  type UtbmsReferenceResponse,
  type AdversePartyRecord,
} from "../services/api";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function getStatusTone(status: string | null) {
  switch (status) {
    case "Open":
      return "bg-primary/10 text-primary";
    case "Drafting":
      return "bg-amber-500/10 text-amber-300";
    case "Hearing Scheduled":
      return "bg-blue-500/10 text-blue-300";
    case "Negotiation":
      return "bg-cyan-500/10 text-cyan-300";
    case "Closed":
      return "bg-white/10 text-slate-300";
    default:
      return "bg-white/10 text-slate-300";
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const { user } = useAuth();
  const parsedCaseId = Number(caseId);
  const [detail, setDetail] = useState<CaseDetailRecord | null>(null);
  const [team, setTeam] = useState<CaseTeamResponse | null>(null);
  const [documents, setDocuments] = useState<CaseDocumentsResponse | null>(null);
  const [history, setHistory] = useState<CaseStatusHistoryResponse | null>(null);
  const [billing, setBilling] = useState<CaseBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adverse Parties state
  const [adverseParties, setAdverseParties] = useState<AdversePartyRecord[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyType, setNewPartyType] = useState("DEFENDANT");
  const [newAffiliate, setNewAffiliate] = useState("");
  const [submittingParty, setSubmittingParty] = useState(false);
  const [partySuccess, setPartySuccess] = useState<string | null>(null);

  // LEDES 1998B state
  const [selectedLedesBillId, setSelectedLedesBillId] = useState<number | null>(null);
  const [ledesData, setLedesData] = useState<LedesInvoiceResponse | null>(null);
  const [loadingLedes, setLoadingLedes] = useState(false);
  const [showLedesModal, setShowLedesModal] = useState(false);

  // UTBMS Codes modal state
  const [showUtbmsModal, setShowUtbmsModal] = useState(false);
  const [utbmsCodes, setUtbmsCodes] = useState<UtbmsReferenceResponse | null>(null);

  useEffect(() => {
    if (!Number.isFinite(parsedCaseId)) {
      setError("Invalid case id.");
      setLoading(false);
      return;
    }

    let active = true;

    Promise.all([
      getCaseDetail(parsedCaseId, user.id),
      getCaseTeam(parsedCaseId, user.id),
      getCaseDocuments(parsedCaseId, user.id),
      getCaseStatusHistory(parsedCaseId, user.id),
      getCaseBilling(parsedCaseId, user.id),
      getCaseAdverseParties(parsedCaseId).catch(() => []),
    ])
      .then(([detailData, teamData, documentData, historyData, billingData, partiesData]) => {
        if (!active) {
          return;
        }

        setDetail(detailData);
        setTeam(teamData);
        setDocuments(documentData);
        setHistory(historyData);
        setBilling(billingData);
        setAdverseParties(partiesData);
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
  }, [parsedCaseId, user.id]);

  const handleCloseCase = async () => {
    if (!detail || closing) return;
    if (!window.confirm("Are you sure you want to close this matter? This will set the end date to today and prevent further edits.")) return;

    setClosing(true);
    try {
      const updated = await closeCase(detail.case_id, user.id);
      setDetail(updated);
      const historyData = await getCaseStatusHistory(detail.case_id, user.id);
      setHistory(historyData);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not close case.");
    } finally {
      setClosing(false);
    }
  };

  const handleOpenLedes = async (billId: number) => {
    setSelectedLedesBillId(billId);
    setShowLedesModal(true);
    setLoadingLedes(true);
    try {
      const data = await getLedesInvoice(billId);
      setLedesData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load LEDES 1998B invoice");
      setShowLedesModal(false);
    } finally {
      setLoadingLedes(false);
    }
  };

  const handleOpenUtbms = async () => {
    setShowUtbmsModal(true);
    if (!utbmsCodes) {
      try {
        const codes = await getUtbmsCodes();
        setUtbmsCodes(codes);
      } catch (_err) {
        // Fallback
      }
    }
  };

  const handleAddPartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !newPartyName.trim()) return;
    try {
      setSubmittingParty(true);
      await addCaseAdverseParty(detail.case_id, {
        party_name: newPartyName.trim(),
        party_type: newPartyType,
        corporate_affiliate: newAffiliate.trim() || undefined,
      });
      setPartySuccess(`Registered adverse entity: ${newPartyName.trim()}`);
      setShowAddPartyModal(false);
      setNewPartyName("");
      setNewAffiliate("");
      const updated = await getCaseAdverseParties(detail.case_id);
      setAdverseParties(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to register adverse party");
    } finally {
      setSubmittingParty(false);
    }
  };

  const accessDenied = useMemo(
    () => (error ?? "").toLowerCase().includes("access"),
    [error],
  );
  const teamMembers = team?.team ?? [];
  const statusHistory = history?.history ?? [];
  const documentItems = documents?.documents ?? [];
  const billingEntries = billing?.entries ?? [];
  const billingSummary = billing?.summary ?? {
    bill_count: 0,
    total_amount: 0,
    approved_amount: 0,
    pending_amount: 0,
    total_hours: 0,
    time_log_count: 0,
  };
  const hearings = detail?.hearings ?? [];

  if (!Number.isFinite(parsedCaseId)) {
    return <div className="card-premium p-6 text-sm text-red-300">Invalid case id.</div>;
  }

  if (loading) {
    return (
      <div className="card-premium p-6 text-sm text-muted-foreground">
        Loading case detail...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link to="/cases" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft size={16} />
          Back to cases
        </Link>
        <div className="card-premium p-6">
          <h1 className="text-xl font-semibold text-foreground">
            {accessDenied ? "Access denied" : "Case unavailable"}
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            {error || "Case not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Link to="/cases" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft size={16} />
        Back to cases
      </Link>

      {/* Main Matter Header Card */}
      <section className="card-premium p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-primary">
                {formatCaseCode(detail.case_code, `Matter #${detail.case_id}`)}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(
                  detail.status,
                )}`}
              >
                {detail.status || "Unknown"}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                {detail.case_type || "General matter"}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                {detail.client.display_name || "Unknown client"}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {detail.title || "Untitled matter"}
            </h1>

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-400">
              <span>Opened {formatDate(detail.start_date)}</span>
              <span>Target {formatDate(detail.end_date, "Open ended")}</span>
              <span>Lead {detail.lead_partner.name || "Unassigned"}</span>
              <span>Senior {detail.lead_senior.name || "Not assigned"}</span>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-3">
            <SummaryCard label="Team" value={detail.metrics.team_size} />
            <SummaryCard label="Documents" value={detail.metrics.document_count} />
            <SummaryCard label="Billing" value={formatCurrency(detail.metrics.billed_total)} />
            <SummaryCard label="Hours" value={detail.metrics.total_hours} />
          </div>
        </div>

        {detail.status !== "Closed" && (
          <div className="mt-8 flex border-t border-white/5 pt-6">
            <button
              onClick={handleCloseCase}
              disabled={closing}
              className="page-button-primary bg-red-500/80 hover:bg-red-500 text-white border-red-500/50"
            >
              {closing ? "Closing..." : "Close Matter"}
            </button>
          </div>
        )}
      </section>

      {/* Description */}
      <section className="card-premium p-6">
        <p className="eyebrow">Description</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {detail.description || "No description available."}
          </p>
        </div>
      </section>

      {/* Team & Status Timeline */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card-premium p-6">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Team</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {teamMembers.length ? (
              teamMembers.map((member) => (
                <div
                  key={member.employee_id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="font-semibold text-foreground">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {member.role_in_case || member.role_name || "Assigned team member"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {member.department_name || member.role_name || "Firm staff"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState message="No team assignments found." />
            )}
          </div>
        </div>

        <div className="card-premium p-6">
          <h2 className="text-xl font-semibold text-foreground">Status Timeline</h2>
          <div className="mt-5 space-y-4">
            {statusHistory.length ? (
              statusHistory.map((item, index) => (
                <div key={item.history_id} className="relative pl-8">
                  {index !== statusHistory.length - 1 ? (
                    <span className="absolute left-[11px] top-8 h-[calc(100%+0.75rem)] w-px bg-white/10" />
                  ) : null}
                  <span className="absolute left-0 top-1.5 h-6 w-6 rounded-full border border-primary/30 bg-primary/10" />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-400">{item.old_status || "New matter"}</span>
                      <span className="text-primary">to</span>
                      <span className="font-semibold text-foreground">
                        {item.new_status || "Updated"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.changed_by_name || "Unknown"} | {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No status events recorded." />
            )}
          </div>
        </div>
      </section>

      {/* Documents & Billing Section */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Documents */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Documents</h2>
          </div>
          <div className="mt-5 space-y-3">
            {documentItems.length ? (
              documentItems.map((document) => (
                <div
                  key={document.document_id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {document.file_name || "Document"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {document.confidentiality_level || "Internal"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Uploaded {formatDateTime(document.created_at)}
                    </p>
                  </div>
                  {document.document_id ? (
                    <a
                      href={getDocumentDownloadUrl(document.document_id, user.id)}
                      className="page-button-secondary shrink-0"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  )}
                </div>
              ))
            ) : (
              <EmptyState message="No documents have been uploaded for this case yet." />
            )}
          </div>
        </div>

        {/* Billing & LEDES 1998B */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Billing & Invoices</h2>
            <button
              type="button"
              onClick={handleOpenUtbms}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-cyan-400 hover:bg-white/10 transition"
            >
              UTBMS Standard Codes
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Total" value={formatCurrency(billingSummary.total_amount)} />
            <SummaryCard label="Entries" value={billingSummary.bill_count} />
            <SummaryCard
              label="Pending"
              value={formatCurrency(billingSummary.pending_amount)}
            />
            <SummaryCard label="Hours" value={billingSummary.total_hours} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Bill</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-3 py-2.5 font-medium text-center">Export</th>
                </tr>
              </thead>
              <tbody>
                {billingEntries.length ? (
                  billingEntries.map((entry) => (
                    <tr key={entry.bill_id} className="border-t border-white/10 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-foreground font-medium">#{entry.bill_id}</td>
                      <td className="px-3 py-2.5 text-slate-300">{entry.status || "Pending"}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-primary">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenLedes(entry.bill_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                        >
                          <FileCode size={13} />
                          LEDES 1998B
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No billing entries available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Adverse Parties & Conflict Registry Section */}
      <section className="card-premium p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-rose-400" />
            <h2 className="text-xl font-semibold text-foreground">Adverse Parties & Opposing Entities</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPartyModal(true)}
            className="page-button-primary flex items-center gap-1.5 text-xs self-start"
          >
            <Plus size={14} />
            Register Adverse Entity
          </button>
        </div>

        {partySuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={16} />
            <span>{partySuccess}</span>
          </div>
        )}

        {adverseParties.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Party ID</th>
                  <th className="px-4 py-2.5 font-medium">Entity Name</th>
                  <th className="px-4 py-2.5 font-medium">Adverse Role</th>
                  <th className="px-4 py-2.5 font-medium">Corporate Affiliate</th>
                  <th className="px-4 py-2.5 font-medium">Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {adverseParties.map((p) => (
                  <tr key={p.party_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-slate-400 font-mono">#{p.party_id}</td>
                    <td className="px-4 py-2.5 font-bold text-foreground">{p.party_name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                        {p.party_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {p.corporate_affiliate ? (
                        <span className="flex items-center gap-1">
                          <Building size={12} className="text-slate-400" />
                          {p.corporate_affiliate}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{formatDateTime(p.added_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No registered adverse parties or opposing counsel recorded for this matter." />
        )}
      </section>

      {/* Hearings Section */}
      <section className="card-premium p-6">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Hearings</h2>
        </div>
        <div className="mt-5 space-y-4">
          {hearings.length ? (
            hearings.map((hearing, index) => (
              <div key={hearing.hearing_id} className="relative pl-8">
                {index !== hearings.length - 1 ? (
                  <span className="absolute left-[11px] top-8 h-[calc(100%+0.75rem)] w-px bg-white/10" />
                ) : null}
                <span className="absolute left-0 top-1.5 h-6 w-6 rounded-full border border-primary/30 bg-primary/10" />
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {hearing.court_name || "Court to be confirmed"}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatDate(hearing.date)} | {hearing.location || "Location pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      Hearing #{hearing.hearing_id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {hearing.notes || "No hearing notes recorded."}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No hearings scheduled for this matter." />
          )}
        </div>
      </section>

      {/* MODAL: Register Adverse Party */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserX size={18} className="text-rose-400" />
                <h3 className="text-lg font-bold text-foreground">Register Case Adverse Entity</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPartySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Adverse Party / Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="e.g. Apex Opposing LLC"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Party Type / Role
                  </label>
                  <select
                    value={newPartyType}
                    onChange={(e) => setNewPartyType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="DEFENDANT" className="bg-slate-900 text-white">Defendant</option>
                    <option value="PLAINTIFF" className="bg-slate-900 text-white">Plaintiff</option>
                    <option value="OPPOSING_COUNSEL" className="bg-slate-900 text-white">Opposing Counsel</option>
                    <option value="CROSS_DEFENDANT" className="bg-slate-900 text-white">Cross-Defendant</option>
                    <option value="THIRD_PARTY" className="bg-slate-900 text-white">Third-Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Corporate Affiliate (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAffiliate}
                    onChange={(e) => setNewAffiliate(e.target.value)}
                    placeholder="e.g. Apex Parent Holdings"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="page-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingParty}
                  className="page-button-primary text-xs"
                >
                  {submittingParty ? "Saving..." : "Register Adverse Party"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LEDES 1998B Preview & Download */}
      {showLedesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileCode size={20} className="text-cyan-400" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    LEDES 1998B Canonical Flat File Invoice
                  </h3>
                  <p className="text-xs text-slate-400">
                    Institutional Legal Electronic Data Exchange Standard (24 fields delimited by [])
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLedesModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {loadingLedes ? (
              <div className="py-12 text-center text-sm text-slate-400">Generating canonical LEDES format...</div>
            ) : ledesData ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-slate-400">Invoice Number: </span>
                    <span className="font-mono font-bold text-foreground">{ledesData.invoice_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Billed: </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(ledesData.total_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Field Specification: </span>
                    <span className="font-mono font-bold text-cyan-400">24 Canonical Fields</span>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      ledesData.is_valid
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}>
                      {ledesData.is_valid ? "VALID LEDES 1998B" : "VALIDATION ISSUES"}
                    </span>
                  </div>
                  {selectedLedesBillId && (
                    <a
                      href={getLedesDownloadUrl(selectedLedesBillId)}
                      download={`invoice_${ledesData.invoice_number}_ledes1998b.txt`}
                      className="page-button-primary flex items-center gap-1.5 text-xs py-1.5"
                    >
                      <Download size={14} />
                      Download .txt
                    </a>
                  )}
                </div>

                {/* Raw Flat File View */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Canonical Flat File Raw Output ([] Delimited)
                  </p>
                  <pre className="rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all max-h-64">
                    {ledesData.file_content}
                  </pre>
                </div>

                {/* Parsed Flat File Lines */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Flat File Line Entries ({ledesData.line_item_count} items)
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-left text-xs font-mono">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 font-medium">#</th>
                          <th className="px-3 py-2 font-medium">Task</th>
                          <th className="px-3 py-2 font-medium">Activity</th>
                          <th className="px-3 py-2 font-medium">Expense</th>
                          <th className="px-3 py-2 font-medium text-right">Units</th>
                          <th className="px-3 py-2 font-medium text-right">Rate</th>
                          <th className="px-3 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledesData.file_content
                          .trim()
                          .split("\n")
                          .slice(1)
                          .map((rawLine, idx) => {
                            const cols = rawLine.split("[]");
                            return (
                              <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 text-cyan-400">{cols[18] || "—"}</td>
                                <td className="px-3 py-2 text-cyan-400">{cols[19] || "—"}</td>
                                <td className="px-3 py-2 text-cyan-400">{cols[20] || "—"}</td>
                                <td className="px-3 py-2 text-right text-slate-300">{cols[14] || "—"}</td>
                                <td className="px-3 py-2 text-right text-slate-300">{cols[13] ? `$${cols[13]}` : "—"}</td>
                                <td className="px-3 py-2 text-right font-bold text-foreground">
                                  {cols[16] ? `$${cols[16]}` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: UTBMS Reference Codes */}
      {showUtbmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileCode size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-foreground">
                  Uniform Task-Based Management System (UTBMS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUtbmsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2">Activity Codes (A101 - A112)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A101</b>: Plan and prepare for</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A102</b>: Research</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A103</b>: Draft / revise</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A104</b>: Review / analyze</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A105</b>: Communicate (in firm)</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A106</b>: Communicate (with client)</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A107</b>: Communicate (other outside)</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">A108</b>: Appear / attend</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2">Litigation Task Codes (L110 - L530)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L110</b>: Case Assessment & Development</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L120</b>: Analysis / Strategy</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L210</b>: Fact Investigation</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L310</b>: Written Discovery</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L330</b>: Depositions</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">L410</b>: Fact Witness Prep</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2">Expense Codes (E101 - E124)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">E101</b>: Copying</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">E105</b>: Telephone charges</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">E108</b>: Postage / Courier</div>
                  <div className="rounded-lg bg-white/5 p-2 font-mono"><b className="text-foreground">E112</b>: Court fees / Filings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
