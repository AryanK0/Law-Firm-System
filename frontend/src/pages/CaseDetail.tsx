import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../content/AuthContext";
import {
  getCaseBilling,
  getCaseDetail,
  getCaseDocuments,
  getCaseStatusHistory,
  getCaseTeam,
  resolveFileUrl,
  type CaseBillingResponse,
  type CaseDetailRecord,
  type CaseDocumentsResponse,
  type CaseStatusHistoryEntry,
  type CaseStatusHistoryResponse,
  type CaseTeamResponse,
} from "../services/api";
import { formatCaseCode, formatCurrency, formatDate, formatDateTime } from "../lib/format";

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

function buildTimeline(detail: CaseDetailRecord, history: CaseStatusHistoryEntry[] | undefined) {
  const ordered = [...(history ?? [])].reverse();
  const items = ordered.map((item) => ({
    key: `history-${item.history_id}`,
    label: item.new_status || detail.status || "Open",
    note: item.old_status
      ? `Moved from ${item.old_status} by ${item.changed_by_name || "Unknown"}`
      : `Created by ${item.changed_by_name || detail.created_by.name || "Unknown"}`,
    timestamp: item.timestamp,
  }));

  if (items.length === 0) {
    return [
      {
        key: "current",
        label: detail.status || "Open",
        note: "Current status",
        timestamp: detail.start_date,
      },
    ];
  }

  return items;
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

  const timeline = useMemo(
    () => (detail ? buildTimeline(detail, history?.history) : []),
    [detail, history?.history],
  );

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
    const denied =
      (error || "").toLowerCase().includes("access") ||
      (error || "").toLowerCase().includes("403");

    return (
      <div className="space-y-4">
        <Link
          to="/cases"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft size={16} />
          Back to cases
        </Link>
        <div className="card-premium p-6 text-sm text-red-300">
          {denied
            ? "You do not have access to this case."
            : error || "Case not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/cases"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft size={16} />
        Back to cases
      </Link>

      <section className="card-premium p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="eyebrow">Description</p>
              <p className="mt-3 text-base leading-7 text-slate-300">
                {detail.description || "No description available."}
              </p>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Team</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {detail.metrics.team_size}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Documents
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {detail.metrics.document_count}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Billing
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {formatCurrency(detail.metrics.billed_total)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Hours</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {detail.metrics.total_hours}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card-premium p-6">
          <p className="eyebrow">Client Info</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {detail.client.display_name || "Client pending"}
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            {detail.client.contact_info || "No contact info on file."}
          </p>
        </div>
        <div className="card-premium p-6">
          <p className="eyebrow">Lead Team</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {detail.lead_partner.name || "Lead partner pending"}
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Senior lead: {detail.lead_senior.name || "Not assigned"}
          </p>
        </div>
        <div className="card-premium p-6">
          <p className="eyebrow">Matter Dates</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            Opened {formatDate(detail.start_date)}
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Target close {formatDate(detail.end_date, "Open ended")}
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
            {team?.team.length ? (
              team.team.map((member) => (
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
            {timeline.length ? (
              timeline.map((item, index) => (
                <div key={item.key} className="relative pl-8">
                  {index !== timeline.length - 1 ? (
                    <span className="absolute left-[11px] top-7 h-[calc(100%+0.75rem)] w-px bg-white/10" />
                  ) : null}
                  <span className="absolute left-0 top-1.5 h-6 w-6 rounded-full border border-primary/30 bg-primary/10" />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(item.timestamp, "Status recorded")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{item.note}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No status events recorded." />
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card-premium p-6">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Documents</h2>
          </div>
          <div className="mt-5 space-y-3">
            {documents?.documents.length ? (
              documents.documents.map((document) => (
                <div
                  key={document.document_id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {document.file_name || "Document"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Uploaded by {document.uploaded_by_name || "Unknown"} |{" "}
                      {formatDateTime(document.created_at)}
                    </p>
                  </div>
                  {document.file_url ? (
                    <a
                      href={resolveFileUrl(document.file_url) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="page-button-secondary"
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
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatCurrency(billing?.summary.total_amount)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Entries</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {billing?.summary.bill_count ?? 0}
              </p>
            </div>
          </div>

          {billing?.entries.length ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        Bill
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {billing.entries.map((entry) => (
                      <tr key={entry.bill_id}>
                        <td className="px-4 py-3 text-sm text-foreground">
                          #{entry.bill_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {entry.status || "Pending"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState message="No billing entries available." />
            </div>
          )}
        </div>
      </section>

      <section className="card-premium p-6">
        <h2 className="text-xl font-semibold text-foreground">Hearings</h2>
        <div className="mt-5 space-y-3">
          {detail.hearings.length ? (
            detail.hearings.map((hearing) => (
              <div
                key={hearing.hearing_id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {hearing.court_name || "Court pending"}
                    </p>
                    <p className="text-sm text-slate-300">
                      {formatDate(hearing.date)} | {hearing.location || "Location pending"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {hearing.jurisdiction_type || "Hearing"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {hearing.notes || "No hearing notes recorded."}
                </p>
              </div>
            ))
          ) : (
            <EmptyState message="No hearings scheduled for this case." />
          )}
        </div>
      </section>
    </div>
  );
}
