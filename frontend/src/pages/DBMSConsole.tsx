import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Cpu,
  Database,
  FileClock,
  Layers,
  LockKeyhole,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";

import { useAuth } from "../content/AuthContext";
import { formatCurrency, formatDateTime, truncate } from "../lib/format";
import {
  getDbmsCaseReports,
  getDbmsCheckpoints,
  getDbmsEmployeeReports,
  getDbmsLocks,
  getDbmsTicketReports,
  getDbmsTransactions,
  getSystemTelemetry,
  clearSystemCache,
  type DbmsCaseReportRecord,
  type DbmsCheckpointRecord,
  type DbmsEmployeeReportRecord,
  type DbmsLockRecord,
  type DbmsTicketReportRecord,
  type DbmsTransactionsResponse,
  type SystemTelemetryResponse,
} from "../services/api";

const emptyTransactions: DbmsTransactionsResponse = {
  recent: [],
  failures: [],
  recovery_logs: [],
};

function StatusPill({ value }: { value: string | null | undefined }) {
  const tone = useMemo(() => {
    switch (value) {
      case "Failed":
      case "Overdue":
        return "bg-red-500/10 text-red-300";
      case "Recovered":
      case "Released":
      case "Success":
        return "bg-emerald-500/10 text-emerald-300";
      case "Active":
      case "Due Soon":
        return "bg-amber-500/10 text-amber-300";
      default:
        return "bg-white/10 text-slate-300";
    }
  }, [value]);

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {value || "Unknown"}
    </span>
  );
}

function SectionHeader({
  title,
  label,
  icon,
}: {
  title: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{label}</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <span className="icon-accent rounded-xl p-2">{icon}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function operationsText(value: string | null | undefined) {
  return (value || "")
    .replace(/DBMS console/gi, "systems view")
    .replace(/DBMS/gi, "systems")
    .replace(/checkpoint/gi, "snapshot")
    .replace(/active_locks/gi, "protected_records")
    .replace(/transaction/gi, "activity")
    .replace(/recovery/gi, "resolution");
}

export default function DBMSConsole() {
  const { user } = useAuth();
  const [locks, setLocks] = useState<DbmsLockRecord[]>([]);
  const [transactions, setTransactions] =
    useState<DbmsTransactionsResponse>(emptyTransactions);
  const [checkpoints, setCheckpoints] = useState<DbmsCheckpointRecord[]>([]);
  const [caseReports, setCaseReports] = useState<DbmsCaseReportRecord[]>([]);
  const [employeeReports, setEmployeeReports] = useState<DbmsEmployeeReportRecord[]>([]);
  const [ticketReports, setTicketReports] = useState<DbmsTicketReportRecord[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConsole = useCallback(async () => {
    const [
      lockData,
      transactionData,
      checkpointData,
      caseReportData,
      employeeReportData,
      ticketReportData,
      telemetryData,
    ] = await Promise.all([
      getDbmsLocks(user.id),
      getDbmsTransactions(user.id),
      getDbmsCheckpoints(user.id),
      getDbmsCaseReports(user.id),
      getDbmsEmployeeReports(user.id),
      getDbmsTicketReports(user.id),
      getSystemTelemetry().catch(() => null),
    ]);

    setLocks(lockData);
    setTransactions(transactionData);
    setCheckpoints(checkpointData);
    setCaseReports(caseReportData);
    setEmployeeReports(employeeReportData);
    setTicketReports(ticketReportData);
    if (telemetryData) {
      setTelemetry(telemetryData);
    }
  }, [user.id]);

  useEffect(() => {
    let active = true;

    loadConsole()
      .then(() => {
        if (active) {
          setError(null);
        }
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
  }, [loadConsole]);

  const refresh = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await loadConsole();
      setError(null);
      setMessage("Systems view refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleClearCache = async () => {
    setBusy(true);
    try {
      await clearSystemCache();
      setMessage("System cache cleared across Redis and in-memory tiers.");
      const updated = await getSystemTelemetry();
      setTelemetry(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cache flush failed.");
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { label: "Protected records", value: locks.length },
    { label: "Interrupted activity", value: transactions.failures.length },
    { label: "Continuity snapshots", value: checkpoints.length },
    { label: "Matter reports", value: caseReports.length },
  ];

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <Database size={14} />
            Systems Oversight
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Operations, History and Reports
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="page-button-secondary"
            onClick={refresh}
            disabled={busy}
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <div className="mb-6 card-premium p-5 text-sm text-red-300">{error}</div> : null}
      {message ? (
        <div className="mb-6 card-premium p-5 text-sm text-emerald-300">{message}</div>
      ) : null}

      {/* Phase 5: Resilient Infrastructure & Observability */}
      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cache Telemetry */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Caching Layer</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Redis & Resilience Tier</h2>
            </div>
            <span className="icon-accent rounded-xl p-2 text-cyan-400">
              <Zap size={18} />
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400">Active Storage Backend:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                telemetry?.cache.redis_connected
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {telemetry?.cache.redis_connected ? "Redis Distributed" : "In-Memory Fallback Active"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Hit Ratio</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">
                {telemetry?.cache.hit_ratio_percent ?? 0}%
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Cache Hits</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {telemetry?.cache.hits ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Cache Misses</p>
              <p className="mt-1 text-lg font-bold text-slate-400">
                {telemetry?.cache.misses ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Keys in store: <b className="text-foreground">{telemetry?.cache.keys_in_memory ?? 0}</b>
            </span>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={busy}
              className="page-button-secondary text-xs flex items-center gap-1.5 py-1 px-3 text-rose-300 hover:text-rose-200"
            >
              <Trash2 size={13} />
              Flush Cache
            </button>
          </div>
        </div>

        {/* Tracing & Latency Telemetry */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Distributed Tracing</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Latency & Observability</h2>
            </div>
            <span className="icon-accent rounded-xl p-2 text-primary">
              <Activity size={18} />
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400">System Uptime:</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {Math.floor((telemetry?.metrics.uptime_seconds ?? 0) / 60)}m {(telemetry?.metrics.uptime_seconds ?? 0) % 60}s
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Avg Latency</p>
              <p className="mt-1 text-lg font-bold text-cyan-300">
                {telemetry?.metrics.avg_latency_ms ?? 0}ms
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">P95 Latency</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {telemetry?.metrics.p95_latency_ms ?? 0}ms
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Requests</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {telemetry?.metrics.total_requests ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              HTTP 2xx: <b className="text-emerald-400">{telemetry?.metrics.status_2xx ?? 0}</b> • 4xx: <b className="text-amber-400">{telemetry?.metrics.status_4xx ?? 0}</b> • 5xx: <b className="text-rose-400">{telemetry?.metrics.status_5xx ?? 0}</b>
            </span>
            <span className="text-[11px] text-slate-400">
              Slow (&gt;1s): <b className={(telemetry?.metrics.slow_requests_gt_1s ?? 0) > 0 ? "text-amber-400" : "text-slate-400"}>{telemetry?.metrics.slow_requests_gt_1s ?? 0}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="card-premium p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="card-premium p-6">
          <SectionHeader
            label="Access Safeguards"
            title="Protected Records"
            icon={<LockKeyhole size={18} />}
          />
          {locks.length === 0 ? (
            <EmptyState message="No protected records." />
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Table</th>
                    <th className="px-3 py-3">Record</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Protected At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {locks.map((lock) => (
                    <tr key={lock.lock_id}>
                      <td className="px-3 py-3 text-foreground">{lock.table_name}</td>
                      <td className="px-3 py-3 text-slate-300">#{lock.record_id}</td>
                      <td className="px-3 py-3 text-slate-300">
                        {lock.locked_by_name || "System"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill value={lock.status} />
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        {formatDateTime(lock.locked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-premium p-6">
          <SectionHeader
            label="Exception Review"
            title="Interrupted Activities"
            icon={<ShieldAlert size={18} />}
          />
          {transactions.failures.length === 0 ? (
            <EmptyState message="No interrupted activities logged." />
          ) : (
            <div className="mt-5 space-y-3">
              {transactions.failures.slice(0, 5).map((txn) => (
                <div
                  key={txn.txn_id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        #{txn.txn_id} {txn.txn_type}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {txn.table_name} #{txn.record_id ?? "n/a"} | {txn.action}
                      </p>
                    </div>
                    <StatusPill value={txn.status} />
                  </div>
                  <p className="mt-3 text-sm text-red-300">
                    {truncate(txn.error_message, 140) || "No error message captured."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="card-premium p-6">
          <SectionHeader
            label="Continuity"
            title="Snapshot History"
            icon={<FileClock size={18} />}
          />
          {checkpoints.length === 0 ? (
            <EmptyState message="No continuity snapshots available." />
          ) : (
            <div className="mt-5 space-y-3">
              {checkpoints.slice(0, 5).map((checkpoint) => (
                <div
                  key={checkpoint.checkpoint_id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-foreground">
                      {operationsText(checkpoint.checkpoint_name)}
                    </p>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(checkpoint.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {truncate(operationsText(checkpoint.notes), 180)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-premium p-6">
          <SectionHeader
            label="Resolution History"
            title="Corrected Activity"
            icon={<RotateCcw size={18} />}
          />
          {transactions.recovery_logs.length === 0 ? (
            <EmptyState message="No resolution history entries." />
          ) : (
            <div className="mt-5 space-y-3">
              {transactions.recovery_logs.slice(0, 6).map((txn) => (
                <div
                  key={txn.txn_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      #{txn.txn_id} {txn.txn_type}
                    </p>
                    <p className="text-slate-400">
                      {txn.table_name} | {formatDateTime(txn.created_at)}
                    </p>
                  </div>
                  <StatusPill value={txn.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card-premium p-6">
        <SectionHeader label="Workload Reports" title="Compiled Matter Reports" icon={<Database size={18} />} />
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div>
            <p className="mb-3 text-sm font-semibold text-primary">Case Reports</p>
            <div className="space-y-3">
              {caseReports.slice(0, 4).map((report) => (
                <div key={report.report_id} className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="font-semibold text-foreground">{report.case_code}</p>
                  <p className="mt-1 text-sm text-slate-400">{truncate(report.summary, 105)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span>{formatCurrency(report.total_billing)}</span>
                    <span>{report.total_hours} hrs</span>
                    <span>{report.document_count} docs</span>
                  </div>
                </div>
              ))}
              {caseReports.length === 0 ? <EmptyState message="No case reports." /> : null}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-primary">Employee Reports</p>
            <div className="space-y-3">
              {employeeReports.slice(0, 4).map((report) => (
                <div key={report.report_id} className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="font-semibold text-foreground">{report.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{truncate(report.summary, 105)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span>{report.active_cases} cases</span>
                    <span>{report.total_hours} hrs</span>
                    <span>{report.tickets_raised} tickets</span>
                  </div>
                </div>
              ))}
              {employeeReports.length === 0 ? <EmptyState message="No employee reports." /> : null}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-primary">Ticket Reports</p>
            <div className="space-y-3">
              {ticketReports.slice(0, 4).map((report) => (
                <div key={report.report_id} className="rounded-2xl bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foreground">Ticket #{report.ticket_id}</p>
                    <StatusPill value={report.sla_status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{truncate(report.summary, 105)}</p>
                  <p className="mt-3 text-xs text-slate-300">
                    Owner {report.assigned_to_name || "unassigned"}
                  </p>
                </div>
              ))}
              {ticketReports.length === 0 ? <EmptyState message="No ticket reports." /> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
