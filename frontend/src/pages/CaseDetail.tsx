import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Gavel, Users } from "lucide-react";
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
  type CaseBillingResponse,
  type CaseDetailRecord,
  type CaseDocumentsResponse,
  type CaseStatusHistoryResponse,
  type CaseTeamResponse,
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
    ])
      .then(([detailData, teamData, documentData, historyData, billingData]) => {
        if (!active) {
          return;
        }

        setDetail(detailData);
        setTeam(teamData);
        setDocuments(documentData);
        setHistory(historyData);
        setBilling(billingData);
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
      // Refresh history too
      const historyData = await getCaseStatusHistory(detail.case_id, user.id);
      setHistory(historyData);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not close case.");
    } finally {
      setClosing(false);
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
    <div className="space-y-8">
      <Link to="/cases" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft size={16} />
        Back to cases
      </Link>

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

      <section className="card-premium p-6">
        <p className="eyebrow">Description</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {detail.description || "No description available."}
          </p>
        </div>
      </section>

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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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

        <div className="card-premium p-6">
          <h2 className="text-xl font-semibold text-foreground">Billing</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryCard label="Total" value={formatCurrency(billingSummary.total_amount)} />
            <SummaryCard label="Entries" value={billingSummary.bill_count} />
            <SummaryCard
              label="Pending"
              value={formatCurrency(billingSummary.pending_amount)}
            />
            <SummaryCard label="Hours" value={billingSummary.total_hours} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Bill</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Generated By</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {billingEntries.length ? (
                  billingEntries.map((entry) => (
                    <tr key={entry.bill_id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-foreground">#{entry.bill_id}</td>
                      <td className="px-4 py-3 text-slate-300">{entry.status || "Pending"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {entry.generated_by_name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(entry.amount)}
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
    </div>
  );
}
