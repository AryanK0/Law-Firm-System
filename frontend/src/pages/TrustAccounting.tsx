import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Lock,
  PlusCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  depositTrustFunds,
  disburseTrustFunds,
  executeThreeWayReconciliation,
  getClientTrustSummary,
  getClients,
  getCases,
  getTrustAccounts,
  transferEarnedFee,
  type ClientRecord,
  type CaseRecord,
  type ClientTrustSummaryResponse,
  type ThreeWayReconciliationResponse,
  type TrustAccountRecord,
} from "../services/api";
import { formatCurrency, formatDateTime } from "../lib/format";

export default function TrustAccounting() {
  const [accounts, setAccounts] = useState<TrustAccountRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected client for sub-ledger preview
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSummary, setClientSummary] = useState<ClientTrustSummaryResponse | null>(null);
  const [clientSummaryLoading, setClientSummaryLoading] = useState(false);

  // 3-Way Reconciliation State
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<ThreeWayReconciliationResponse | null>(null);
  const [bankBalanceInput, setBankBalanceInput] = useState<string>("");
  const [statementDate, setStatementDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reconciliationNotes, setReconciliationNotes] = useState<string>("");

  // Modals state
  const [activeModal, setActiveModal] = useState<"deposit" | "disburse" | "transfer" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Form States
  const [targetAccountId, setTargetAccountId] = useState<number>(1);
  const [formClientId, setFormClientId] = useState<number>(0);
  const [formCaseId, setFormCaseId] = useState<number>(0);
  const [formAmount, setFormAmount] = useState<string>("");
  const [formPayee, setFormPayee] = useState<string>("");
  const [formRef, setFormRef] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>("");
  const [formIoltaId, setFormIoltaId] = useState<number>(1);
  const [formOperatingId, setFormOperatingId] = useState<number>(2);

  // Live client trust balance in disbursement modal
  const [disburseClientBalance, setDisburseClientBalance] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accData, clientData, caseData] = await Promise.all([
        getTrustAccounts(),
        getClients(),
        getCases(),
      ]);
      setAccounts(accData);
      setClients(clientData);
      setCases(caseData);

      const ioltaAcc = accData.find((a) => a.account_type === "IOLTA_TRUST");
      const operAcc = accData.find((a) => a.account_type === "OPERATING");
      if (ioltaAcc) {
        setTargetAccountId(ioltaAcc.account_id);
        setFormIoltaId(ioltaAcc.account_id);
        setBankBalanceInput(String(ioltaAcc.current_balance));
      }
      if (operAcc) {
        setFormOperatingId(operAcc.account_id);
      }
      if (clientData.length > 0) {
        setFormClientId(clientData[0].client_id);
        setSelectedClientId(clientData[0].client_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trust accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch client trust summary when selectedClientId changes
  useEffect(() => {
    if (!selectedClientId) return;
    setClientSummaryLoading(true);
    getClientTrustSummary(selectedClientId)
      .then((data) => setClientSummary(data))
      .catch((_err) => setClientSummary(null))
      .finally(() => setClientSummaryLoading(false));
  }, [selectedClientId]);

  // When formClientId changes in disburse modal, fetch their available trust balance
  useEffect(() => {
    if (activeModal === "disburse" && formClientId > 0) {
      getClientTrustSummary(formClientId)
        .then((data) => setDisburseClientBalance(data.trust_balance))
        .catch(() => setDisburseClientBalance(null));
    }
  }, [activeModal, formClientId]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formAmount || Number(formAmount) <= 0) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await depositTrustFunds({
        account_id: targetAccountId,
        client_id: formClientId,
        amount: Number(formAmount),
        payee_or_payor: formPayee || "Client Retainer Deposit",
        case_id: formCaseId || undefined,
        reference_number: formRef || undefined,
        description: formDesc || "Client Retainer",
      });
      setActionSuccess(`Deposit of ${formatCurrency(res.amount)} credited to Trust Account.`);
      setActiveModal(null);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deposit funds");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formAmount || Number(formAmount) <= 0) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await disburseTrustFunds({
        account_id: targetAccountId,
        client_id: formClientId,
        amount: Number(formAmount),
        payee_or_payor: formPayee || "Disbursement Payee",
        case_id: formCaseId || undefined,
        reference_number: formRef || undefined,
        description: formDesc || "Trust Disbursement",
      });
      setActionSuccess(`Disbursed ${formatCurrency(res.amount)}. Remaining client trust: ${formatCurrency(res.client_running_balance)}`);
      setActiveModal(null);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disbursement failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formAmount || Number(formAmount) <= 0) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await transferEarnedFee({
        iolta_account_id: formIoltaId,
        operating_account_id: formOperatingId,
        client_id: formClientId,
        amount: Number(formAmount),
        case_id: formCaseId || undefined,
        reference_number: formRef || undefined,
        invoice_number: formInvoiceNo || undefined,
      });
      setActionSuccess(`Earned fee transfer completed: ${formatCurrency(res.amount)} transferred to Operating.`);
      setActiveModal(null);
      resetForms();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Earned fee transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunReconciliation = async () => {
    const ioltaAcc = accounts.find((a) => a.account_type === "IOLTA_TRUST");
    if (!ioltaAcc) {
      setError("No IOLTA Trust Account found for reconciliation.");
      return;
    }
    const balanceNum = parseFloat(bankBalanceInput);
    if (isNaN(balanceNum)) {
      setError("Please provide a valid bank statement balance.");
      return;
    }
    try {
      setReconciling(true);
      setError(null);
      const res = await executeThreeWayReconciliation({
        account_id: ioltaAcc.account_id,
        statement_date: statementDate,
        bank_statement_balance: balanceNum,
        notes: reconciliationNotes || "Monthly ABA Rule 1.15 Audit",
      });
      setReconciliationResult(res);
      setActionSuccess("Three-Way Reconciliation performed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setReconciling(false);
    }
  };

  const resetForms = () => {
    setFormAmount("");
    setFormPayee("");
    setFormRef("");
    setFormDesc("");
    setFormInvoiceNo("");
    setDisburseClientBalance(null);
  };

  const ioltaAccounts = accounts.filter((a) => a.account_type === "IOLTA_TRUST");
  const operatingAccounts = accounts.filter((a) => a.account_type === "OPERATING");

  // Calculations for sub-ledger totals
  const totalDeposits = clientSummary?.transactions
    ? clientSummary.transactions
        .filter((t) => t.type === "DEPOSIT")
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const totalDisbursed = clientSummary?.transactions
    ? clientSummary.transactions
        .filter((t) => t.type !== "DEPOSIT")
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="icon-accent rounded-lg p-2 text-primary">
              <Scale size={22} />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Trust Accounting & IOLTA
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            ABA Model Rule 1.15 Fund Segregation, Overdraft Protection & Automated 3-Way Reconciliation
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-deposit-retainer"
            type="button"
            onClick={() => {
              resetForms();
              setActiveModal("deposit");
            }}
            className="page-button-primary flex items-center gap-2"
          >
            <PlusCircle size={16} />
            Deposit Retainer
          </button>
          <button
            id="btn-disburse-trust"
            type="button"
            onClick={() => {
              resetForms();
              setActiveModal("disburse");
            }}
            className="page-button-secondary flex items-center gap-2"
          >
            <ArrowDownRight size={16} />
            Disburse Funds
          </button>
          <button
            id="btn-transfer-earned"
            type="button"
            onClick={() => {
              resetForms();
              setActiveModal("transfer");
            }}
            className="page-button-secondary flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
          >
            <ArrowUpRight size={16} />
            Transfer Earned Fee
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Segregated Accounts Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Segregated Banking Ledgers</h2>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Lock size={12} className="text-primary" /> Strictly Segregated Under Law
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* IOLTA Trust Card */}
          {ioltaAccounts.map((account) => (
            <div
              key={account.account_id}
              className="card-premium relative overflow-hidden border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-background to-background p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                    IOLTA CLIENT TRUST
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-foreground">{account.account_name}</h3>
                  <p className="text-xs text-slate-400">
                    {account.bank_name} • Account #{account.account_number}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
                  <Scale size={24} />
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-slate-400">Escrow Trust Balance</p>
                <p className="mt-1 text-3xl font-extrabold text-cyan-300">
                  {formatCurrency(account.current_balance)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                <span>ABA Model Rule 1.15 Protected</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck size={14} /> Zero Overdraft Guard Active
                </span>
              </div>
            </div>
          ))}

          {/* Operating Account Card */}
          {operatingAccounts.map((account) => (
            <div
              key={account.account_id}
              className="card-premium relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-background to-background p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    GENERAL OPERATING
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-foreground">{account.account_name}</h3>
                  <p className="text-xs text-slate-400">
                    {account.bank_name} • Account #{account.account_number}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                  <Banknote size={24} />
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-slate-400">Operating Balance</p>
                <p className="mt-1 text-3xl font-extrabold text-blue-300">
                  {formatCurrency(account.current_balance)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                <span>Firm Operating & Earned Revenue</span>
                <span className="text-slate-300">Status: Active</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Automated Three-Way Reconciliation Section */}
      <section className="card-premium p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-foreground">Automated Three-Way Reconciliation</h2>
            </div>
            <p className="text-xs text-slate-400">
              Audit Comparison: Bank Statement Balance = General Ledger (Book Balance) = Individual Client Trust Ledgers
            </p>
          </div>
          <button
            id="btn-run-reconciliation"
            type="button"
            disabled={reconciling}
            onClick={handleRunReconciliation}
            className="page-button-primary flex items-center gap-2 self-start"
          >
            <RefreshCw size={16} className={reconciling ? "animate-spin" : ""} />
            {reconciling ? "Auditing Ledgers..." : "Perform 3-Way Audit"}
          </button>
        </div>

        {/* Audit Inputs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Statement Date
            </label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Bank Statement Balance ($)
            </label>
            <input
              id="input-bank-statement-balance"
              type="number"
              step="0.01"
              value={bankBalanceInput}
              onChange={(e) => setBankBalanceInput(e.target.value)}
              placeholder="e.g. 50000.00"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              placeholder="Optional audit log notes"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Reconciliation Result Card */}
        {reconciliationResult && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    reconciliationResult.status === "BALANCED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {reconciliationResult.status}
                </span>
                <span className="text-xs text-slate-400">
                  Reconciled on {formatDateTime(reconciliationResult.reconciled_at)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Variance: </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    reconciliationResult.variance === 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(reconciliationResult.variance)}
                </span>
              </div>
            </div>

            {/* 3 Pillars Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-slate-400 uppercase font-medium">1. Bank Statement</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatCurrency(reconciliationResult.bank_statement_balance)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-slate-400 uppercase font-medium">2. General Ledger Balance</p>
                <p className="mt-1 text-xl font-bold text-primary">
                  {formatCurrency(reconciliationResult.general_ledger_balance)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-slate-400 uppercase font-medium">3. Client Sub-Ledgers Total</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">
                  {formatCurrency(reconciliationResult.client_ledger_balance)}
                </p>
              </div>
            </div>

            {/* Sub-Ledger Breakdown */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Individual Client Trust Ledger Breakdown ({reconciliationResult.client_breakdown.length} Active Accounts)
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Client ID</th>
                      <th className="px-4 py-2 font-medium">Client Name</th>
                      <th className="px-4 py-2 font-medium text-right">Running Trust Balance</th>
                      <th className="px-4 py-2 font-medium text-center">Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationResult.client_breakdown.map((row) => (
                      <tr key={row.client_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-slate-400">#{row.client_id}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{row.client_name}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-cyan-300">
                          {formatCurrency(row.trust_balance)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              row.trust_balance > 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : row.trust_balance === 0
                                ? "bg-slate-500/10 text-slate-400"
                                : "bg-red-500/10 text-red-400 font-bold"
                            }`}
                          >
                            {row.trust_balance > 0 ? "POSITIVE" : row.trust_balance === 0 ? "ZERO" : "OVERDRAFT"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Individual Client Trust Sub-Ledger Inspector */}
      <section className="card-premium p-6 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-cyan-400" />
            <h2 className="text-xl font-semibold text-foreground">Individual Client Trust Sub-Ledger</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Inspect Client:</span>
            <select
              value={selectedClientId || ""}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id} className="bg-slate-900 text-white">
                  {c.name} (#{c.client_id}) {c.organization ? `• ${c.organization}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {clientSummaryLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading client sub-ledger...</div>
        ) : clientSummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Current Trust Escrow</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">
                  {formatCurrency(clientSummary.trust_balance)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Deposits</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {formatCurrency(totalDeposits)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Disbursed / Transferred</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {formatCurrency(totalDisbursed)}
                </p>
              </div>
            </div>

            {/* Client Transactions Table */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Transaction Ledger History ({clientSummary.transactions.length} entries)
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Payee / Payor</th>
                      <th className="px-4 py-2 font-medium">Reference</th>
                      <th className="px-4 py-2 font-medium text-right">Amount</th>
                      <th className="px-4 py-2 font-medium text-right">Client Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientSummary.transactions.length ? (
                      clientSummary.transactions.map((tx) => (
                        <tr key={tx.transaction_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-2 text-slate-400">{formatDateTime(tx.created_at)}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                tx.type === "DEPOSIT"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : tx.type === "DISBURSEMENT"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-blue-500/10 text-blue-400"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-foreground">{tx.payee_or_payor || "—"}</td>
                          <td className="px-4 py-2 font-mono text-slate-400">{tx.reference_number || "—"}</td>
                          <td
                            className={`px-4 py-2 text-right font-mono font-semibold ${
                              tx.type === "DEPOSIT" ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {tx.type === "DEPOSIT" ? "+" : "-"}
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-medium text-cyan-300">
                            {formatCurrency(tx.client_running_balance)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          No trust transactions recorded for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">Select a client to view their ledger.</div>
        )}
      </section>

      {/* MODAL: Deposit Retainer */}
      {activeModal === "deposit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground">Deposit Client Retainer Funds</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Target IOLTA Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {ioltaAccounts.map((a) => (
                    <option key={a.account_id} value={a.account_id} className="bg-slate-900 text-white">
                      {a.account_name} ({formatCurrency(a.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Client
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id} className="bg-slate-900 text-white">
                      {c.name} (#{c.client_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Matter / Case (Optional)
                </label>
                <select
                  value={formCaseId}
                  onChange={(e) => setFormCaseId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value={0}>General Matter Retainer</option>
                  {cases.map((cs) => (
                    <option key={cs.case_id} value={cs.case_id} className="bg-slate-900 text-white">
                      {cs.case_code || `#${cs.case_id}`} - {cs.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Deposit Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Payor Name
                  </label>
                  <input
                    type="text"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Reference / Check / Wire #
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="e.g. WIRE-884192"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="page-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="page-button-primary text-xs"
                >
                  {submitting ? "Processing..." : "Confirm Retainer Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Disburse Trust Funds */}
      {activeModal === "disburse" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={18} className="text-amber-400" />
                <h3 className="text-lg font-bold text-foreground">Disburse Client Trust Funds</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDisburseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Client
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id} className="bg-slate-900 text-white">
                      {c.name} (#{c.client_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Available Balance Indicator */}
              {disburseClientBalance !== null && (
                <div
                  className={`rounded-xl p-3 border text-xs flex items-center justify-between ${
                    disburseClientBalance > 0
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  <span>Client Available Trust Escrow:</span>
                  <span className="font-mono font-bold text-sm">
                    {formatCurrency(disburseClientBalance)}
                  </span>
                </div>
              )}

              {/* Overdraft Prohibition Warning */}
              {formAmount && disburseClientBalance !== null && Number(formAmount) > disburseClientBalance && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 p-3 text-xs text-red-300 font-medium">
                  <AlertTriangle size={16} className="shrink-0 text-red-400" />
                  <span>
                    ABA MODEL RULE 1.15 VIOLATION: Disbursement amount exceeds client escrow balance. Overdrafts are strictly prohibited.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Disbursement Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Payee Name / Purpose
                  </label>
                  <input
                    type="text"
                    required
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    placeholder="e.g. County Court Clerk"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Reference / Check #
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="e.g. CHECK-1002"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="page-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (disburseClientBalance !== null && Number(formAmount) > disburseClientBalance)}
                  className="page-button-primary text-xs"
                >
                  {submitting ? "Processing..." : "Authorize Disbursement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transfer Earned Fee */}
      {activeModal === "transfer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-foreground">Transfer Earned Legal Fee</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <p className="text-xs text-slate-400">
                Transfers billed & earned legal fees out of the IOLTA Client Trust account and into the Firm Operating account.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Client
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id} className="bg-slate-900 text-white">
                      {c.name} (#{c.client_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Earned Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="page-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="page-button-primary text-xs"
                >
                  {submitting ? "Transferring..." : "Complete Fee Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
