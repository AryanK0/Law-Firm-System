import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  FileSearch,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from "lucide-react";

import {
  addCaseAdverseParty,
  checkConflict,
  getCaseAdverseParties,
  getCases,
  type AdversePartyRecord,
  type CaseRecord,
  type ConflictCheckResponse,
  type ConflictMatch,
} from "../services/api";
import { formatDateTime } from "../lib/format";

const QUICK_QUERIES = [
  'Titan Industries',
  'Acme AND Patent',
  '"Global Logistics" OR Apex',
  'Nova NOT Construction',
];

export default function ConflictCheck() {
  const [query, setQuery] = useState("");
  const [proposedClient, setProposedClient] = useState("");
  const [proposedAdverse, setProposedAdverse] = useState("");
  const [matterType, setMatterType] = useState("Litigation");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);

  // Case adverse parties section
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [adverseParties, setAdverseParties] = useState<AdversePartyRecord[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Add adverse party form
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyType, setNewPartyType] = useState("DEFENDANT");
  const [newAffiliate, setNewAffiliate] = useState("");
  const [submittingParty, setSubmittingParty] = useState(false);
  const [partySuccess, setPartySuccess] = useState<string | null>(null);

  useEffect(() => {
    getCases()
      .then((data) => {
        setCases(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].case_id);
        }
      })
      .catch((_err) => setCases([]));
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    setLoadingParties(true);
    getCaseAdverseParties(selectedCaseId)
      .then((data) => setAdverseParties(data))
      .catch((_err) => setAdverseParties([]))
      .finally(() => setLoadingParties(false));
  }, [selectedCaseId]);

  const handleRunSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query && !proposedClient && !proposedAdverse) {
      setError("Please specify a search query or a proposed client / adverse party.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await checkConflict({
        query: query.trim() || proposedClient.trim() || "Conflict Query",
        target_matter_type: matterType,
        proposed_client_name: proposedClient.trim() || undefined,
        proposed_adverse_party: proposedAdverse.trim() || undefined,
      });
      setConflictResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conflict check failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newPartyName.trim()) return;
    try {
      setSubmittingParty(true);
      setError(null);
      await addCaseAdverseParty(selectedCaseId, {
        party_name: newPartyName.trim(),
        party_type: newPartyType,
        corporate_affiliate: newAffiliate.trim() || undefined,
      });
      setPartySuccess(`Registered adverse party: ${newPartyName.trim()}`);
      setShowAddPartyModal(false);
      setNewPartyName("");
      setNewAffiliate("");
      // Refresh adverse parties
      const updated = await getCaseAdverseParties(selectedCaseId);
      setAdverseParties(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register adverse party");
    } finally {
      setSubmittingParty(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CLEARED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "CONFLICT_DETECTED":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "REQUIRES_ETHICAL_WALL":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "REVIEW_RECOMMENDED":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "HIGH":
        return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
      case "ETHICAL_WALL_REQUIRED":
        return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
      case "LOW":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
    }
  };

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
              Conflict of Interest Engine
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Boolean Inverted Index Search & ABA Model Rules 1.7, 1.9, 1.10 Ethical Clearance
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {partySuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{partySuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setPartySuccess(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Input Section */}
      <section className="card-premium p-6 space-y-5">
        <form onSubmit={handleRunSearch} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Boolean Query Search Bar
            </label>
            <div className="relative">
              <input
                id="input-conflict-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "Apex Corp" AND Patents OR "Titan Industries"'
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-slate-500 font-mono"
              />
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Quick Fill Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
              <span>Quick Examples:</span>
              {QUICK_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-cyan-400 hover:border-primary/50 hover:bg-primary/10 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Adversity Parameters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Proposed Client Name
              </label>
              <input
                id="input-proposed-client"
                type="text"
                value={proposedClient}
                onChange={(e) => setProposedClient(e.target.value)}
                placeholder="e.g. Apex Corporation"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Proposed Adverse Party
              </label>
              <input
                id="input-proposed-adverse"
                type="text"
                value={proposedAdverse}
                onChange={(e) => setProposedAdverse(e.target.value)}
                placeholder="e.g. Titan Global Ltd"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Target Matter Type
              </label>
              <select
                value={matterType}
                onChange={(e) => setMatterType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Litigation" className="bg-slate-900 text-white">Litigation</option>
                <option value="Corporate" className="bg-slate-900 text-white">Corporate / M&A</option>
                <option value="IP" className="bg-slate-900 text-white">Intellectual Property</option>
                <option value="Employment" className="bg-slate-900 text-white">Labor & Employment</option>
                <option value="Regulatory" className="bg-slate-900 text-white">Regulatory / Compliance</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-run-conflict-check"
              type="submit"
              disabled={loading}
              className="page-button-primary flex items-center gap-2 text-sm"
            >
              <FileSearch size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Scanning Inverted Index..." : "Run Comprehensive Conflict Search"}
            </button>
          </div>
        </form>
      </section>

      {/* Conflict Check Results View */}
      {conflictResult && (
        <section className="space-y-6 animate-fade-in">
          {/* Top Scorecard Card */}
          <div className="card-premium p-6 border-white/10 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  Conflict Assessment Result
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${getStatusColor(
                      conflictResult.status
                    )}`}
                  >
                    {conflictResult.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-400">
                    Checked {formatDateTime(conflictResult.checked_at)}
                  </span>
                </div>
              </div>

              {/* Risk Meter */}
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Ethical Risk Score</p>
                  <p
                    className={`text-2xl font-black ${
                      conflictResult.risk_score >= 70
                        ? "text-red-400"
                        : conflictResult.risk_score >= 40
                        ? "text-amber-400"
                        : conflictResult.risk_score > 0
                        ? "text-sky-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {conflictResult.risk_score} / 100
                  </p>
                </div>
                <div className="h-10 w-24 rounded-full bg-white/5 overflow-hidden flex items-end p-1">
                  <div
                    className={`w-full rounded-full transition-all duration-700 ${
                      conflictResult.risk_score >= 70
                        ? "bg-red-500"
                        : conflictResult.risk_score >= 40
                        ? "bg-amber-500"
                        : conflictResult.risk_score > 0
                        ? "bg-sky-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ height: `${Math.max(10, conflictResult.risk_score)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Ethical Rules Citation & Screening */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Applicable ABA Model Rule
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {conflictResult.ethical_rule}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ethical Wall Requirement
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">
                    {conflictResult.ethical_wall_required
                      ? "Mandatory Ethical Screen (Rule 1.10)"
                      : "No Ethical Screen Required"}
                  </p>
                </div>
                {conflictResult.ethical_wall_required ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 p-2 text-amber-400">
                    <ShieldAlert size={20} />
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 p-2 text-emerald-400">
                    <ShieldCheck size={20} />
                  </span>
                )}
              </div>
            </div>

            {/* Official Recommendation Box */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Ethical Advisory Recommendation
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {conflictResult.recommendation}
              </p>
            </div>
          </div>

          {/* Matches List */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Matched Conflict Entities ({conflictResult.match_count})
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Parsed Tokens: {conflictResult.search_terms.join(", ") || "—"}
              </span>
            </div>

            {conflictResult.matches.length ? (
              <div className="space-y-3">
                {conflictResult.matches.map((match: ConflictMatch, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2 hover:border-white/20 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getSeverityBadge(match.severity)}`}>
                          {match.severity}
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                          {match.entity_type}
                        </span>
                        <h4 className="font-bold text-foreground text-base">
                          {match.matched_name}
                        </h4>
                        {match.organization && (
                          <span className="text-xs text-slate-400">({match.organization})</span>
                        )}
                      </div>
                      {match.case_id && (
                        <span className="text-xs font-mono text-primary">
                          Case #{match.case_id} {match.case_title ? `• ${match.case_title}` : ""}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {match.description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      <span>Match Type: <code className="text-cyan-400">{match.match_type}</code></span>
                      {match.attorney_name && (
                        <span>Attorney: <span className="text-slate-300">{match.attorney_name}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center text-sm text-emerald-300">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                No conflicting clients, adverse parties, opposing counsel, or active matters found.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Case Adverse Party Registry Section */}
      <section className="card-premium p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <UserX size={18} className="text-rose-400" />
              <h2 className="text-xl font-bold text-foreground">Registered Adverse Parties by Matter</h2>
            </div>
            <p className="text-xs text-slate-400">
              Maintain registered adverse parties and corporate affiliates for conflict-checking validation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCaseId || ""}
              onChange={(e) => setSelectedCaseId(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id} className="bg-slate-900 text-white">
                  {c.case_code || `#${c.case_id}`} - {c.title}
                </option>
              ))}
            </select>

            <button
              id="btn-register-adverse-party"
              type="button"
              onClick={() => setShowAddPartyModal(true)}
              className="page-button-primary flex items-center gap-1.5 text-xs shrink-0"
            >
              <Plus size={14} />
              Register Adverse Party
            </button>
          </div>
        </div>

        {loadingParties ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading adverse parties...</div>
        ) : adverseParties.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Party ID</th>
                  <th className="px-4 py-2.5 font-medium">Party Name</th>
                  <th className="px-4 py-2.5 font-medium">Party Role</th>
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
          <div className="rounded-xl border border-white/10 bg-white/[0.01] p-6 text-center text-xs text-slate-400">
            No adverse parties registered for this matter yet. Click "Register Adverse Party" above to record one.
          </div>
        )}
      </section>

      {/* MODAL: Register Adverse Party */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserX size={18} className="text-rose-400" />
                <h3 className="text-lg font-bold text-foreground">Register Case Adverse Party</h3>
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
                  placeholder="e.g. Titan Global Holdings Inc"
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
                    placeholder="e.g. Titan Parent Co"
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
    </div>
  );
}
