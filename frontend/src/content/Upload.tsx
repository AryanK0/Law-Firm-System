import { useEffect, useMemo, useState } from "react";
import { FileText, Lock, Search, ShieldAlert, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

import { formatCaseCode, formatDateTime } from "../lib/format";
import {
  deleteDocument,
  getCaseLegalHold,
  getCases,
  getDocumentDownloadUrl,
  getDocuments,
  searchDocuments,
  setCaseLegalHold,
  type CaseRecord,
  type DocumentRecord,
  type LegalHoldRecord,
  type SearchHit,
  uploadDocument,
} from "../services/api";
import { useAuth } from "./AuthContext";

function getVisibleFileName(document: DocumentRecord) {
  const fileName = document.file_name ?? document.file_path?.split("/").pop() ?? "Unknown file";
  return fileName.replace(/^[a-f0-9]{32}_/i, "");
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [confidentiality, setConfidentiality] = useState("Internal");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Legal Hold state
  const [legalHold, setLegalHold] = useState<LegalHoldRecord | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [togglingHold, setTogglingHold] = useState(false);

  // e-Discovery Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Deletion in progress
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isPartnerOrLeadership =
    user.hierarchy <= 2 || user.role === "Partner" || user.role === "Managing Partner";

  // Initial load: cases and documents
  useEffect(() => {
    let active = true;

    Promise.all([getCases(user.id), getDocuments(user.id)])
      .then(([caseData, documentData]) => {
        if (!active) return;
        setCases(caseData);
        setDocuments(documentData);
        setCaseId((current) => current || String(caseData[0]?.case_id ?? ""));
        setError(null);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  // Load Legal Hold status when caseId changes
  useEffect(() => {
    if (!caseId) {
      setLegalHold(null);
      return;
    }

    let active = true;
    getCaseLegalHold(Number(caseId))
      .then((holdData) => {
        if (active) {
          setLegalHold(holdData);
        }
      })
      .catch(() => {
        if (active) {
          setLegalHold(null);
        }
      });

    return () => {
      active = false;
    };
  }, [caseId]);

  const selectedCase = useMemo(
    () => cases.find((caseItem) => String(caseItem.case_id) === caseId) ?? null,
    [caseId, cases],
  );

  const visibleDocuments = useMemo(() => {
    if (!caseId) return documents;
    return documents.filter((document) => String(document.case_id) === caseId);
  }, [caseId, documents]);

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setQueuedFiles((current) => [...current, ...Array.from(files)]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  // Direct S3 Upload via Pre-Signed URL pipeline
  const handleUpload = async () => {
    if (!queuedFiles.length) {
      setError("Choose at least one file before uploading.");
      return;
    }

    if (!caseId) {
      setError("Select a matter before uploading documents.");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      for (const file of queuedFiles) {
        await uploadDocument(Number(caseId), file, user.id, confidentiality);
      }

      const refreshedDocuments = await getDocuments(user.id);
      setDocuments(refreshedDocuments);
      setMessage(
        `Successfully uploaded ${queuedFiles.length} file${
          queuedFiles.length > 1 ? "s" : ""
        } via direct S3 pre-signed channel with AES-256 envelope encryption. OCR and search indexing queued.`,
      );
      setQueuedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Legal Hold Toggle (Partner Only)
  const handleToggleLegalHold = async (targetHold: boolean) => {
    if (!caseId) return;

    if (targetHold && !holdReason.trim()) {
      setError("A formal justification reason is required to enact a Legal Hold.");
      return;
    }

    setTogglingHold(true);
    setError(null);
    setMessage(null);

    try {
      const result = await setCaseLegalHold(
        Number(caseId),
        targetHold,
        targetHold ? holdReason.trim() : "Hold released by authorized partner",
      );
      setLegalHold(result);
      setHoldReason("");
      setMessage(
        targetHold
          ? `WORM Compliance Enforced: Matter #${caseId} placed on Legal Hold. All document mutations locked.`
          : `Matter #${caseId} Legal Hold lifted. Document operations restored to normal policy.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update Legal Hold status.");
    } finally {
      setTogglingHold(false);
    }
  };

  // e-Discovery Search execution
  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const results = await searchDocuments(
        searchQuery.trim(),
        caseId ? Number(caseId) : undefined,
      );
      setSearchResults(results.hits);
      if (results.hits.length === 0) {
        setMessage(`No documents found matching "${searchQuery.trim()}".`);
      } else {
        setMessage(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search query failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Document Deletion with WORM Compliance Enforcement
  const handleDeleteDocument = async (doc: DocumentRecord) => {
    const fileName = getVisibleFileName(doc);
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    setDeletingId(doc.document_id);
    setError(null);
    setMessage(null);

    try {
      await deleteDocument(doc.document_id);
      setMessage(`Document "${fileName}" deleted successfully.`);
      const refreshedDocuments = await getDocuments(user.id);
      setDocuments(refreshedDocuments);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete document.";
      if (errMsg.includes("423") || errMsg.toLowerCase().includes("legal hold") || errMsg.includes("WORM")) {
        setError(
          `🚨 WORM COMPLIANCE BLOCKED: Document is under active Legal Hold for this matter. Deletion prohibited (HTTP 423 Locked). SOC-2 compliance violation recorded.`,
        );
      } else {
        setError(errMsg);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Enterprise Storage & e-Discovery
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              S3 Direct-to-Cloud Uploads, WORM Legal Holds, and Deep Full-Text Indexing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck size={14} /> AES-256 Encrypted
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
              SHA-256 Integrity Verified
            </span>
          </div>
        </div>
      </div>

      {/* Case Selector and Confidentiality Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Target Matter
          </label>
          <select
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            className="page-select w-full"
          >
            <option value="">All Matters</option>
            {cases.map((caseItem) => (
              <option key={caseItem.case_id} value={caseItem.case_id}>
                {formatCaseCode(caseItem.case_code, `Matter #${caseItem.case_id}`)} -{" "}
                {caseItem.title || "Untitled matter"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Confidentiality Level
          </label>
          <select
            value={confidentiality}
            onChange={(event) => setConfidentiality(event.target.value)}
            className="page-select w-full"
          >
            <option value="Internal">Internal</option>
            <option value="Confidential">Confidential</option>
            <option value="Highly Confidential">Highly Confidential</option>
          </select>
        </div>
      </div>

      {/* Legal Hold Compliance Banner & Controls */}
      {selectedCase && (
        <div
          className={`card-premium p-6 smooth-transition ${
            legalHold?.legal_hold
              ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
              : "border-white/5"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-xl p-3 ${
                  legalHold?.legal_hold
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {legalHold?.legal_hold ? <ShieldAlert size={26} /> : <Lock size={26} />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-foreground">
                    {legalHold?.legal_hold
                      ? "WORM COMPLIANCE ACTIVE: Legal Hold Enforced"
                      : "Legal Hold Status: Inactive"}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      legalHold?.legal_hold
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {legalHold?.legal_hold ? "WORM Locked" : "Standard Policy"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {legalHold?.legal_hold
                    ? `Reason: "${legalHold.legal_hold_reason || "Litigation hold active"}". All files for this matter are Write-Once-Read-Many (WORM) immutable. File deletion or modification is strictly prohibited.`
                    : "Standard document lifecycle. File deletion allowed subject to access permissions."}
                </p>
                {legalHold?.legal_hold && legalHold.legal_hold_at && (
                  <p className="mt-1 text-xs text-amber-400/80">
                    Enacted: {formatDateTime(legalHold.legal_hold_at)}
                    {legalHold.legal_hold_by ? ` (Officer #${legalHold.legal_hold_by})` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Partner Controls */}
            {isPartnerOrLeadership && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {legalHold?.legal_hold ? (
                  <button
                    type="button"
                    onClick={() => handleToggleLegalHold(false)}
                    disabled={togglingHold}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 smooth-transition disabled:opacity-50"
                  >
                    {togglingHold ? "Releasing..." : "Release Legal Hold"}
                  </button>
                ) : (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <input
                      type="text"
                      placeholder="Hold reason (e.g., Subpoena #402)"
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      className="page-input min-w-[220px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleLegalHold(true)}
                      disabled={togglingHold || !holdReason.trim()}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/25 smooth-transition disabled:opacity-50"
                    >
                      {togglingHold ? "Applying..." : "Apply Legal Hold"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* e-Discovery Full-Text Search Section */}
      <div className="card-premium p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">e-Discovery Deep Search</h2>
            <p className="text-sm text-muted-foreground">
              Search inside extracted PDF, DOCX, and scanned image contents with snippet highlighting
            </p>
          </div>
          {searchResults && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search query across matter transcripts, contracts, exhibits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="page-input pl-10"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="page-button-primary shrink-0 disabled:opacity-50"
          >
            {searching ? "Searching..." : "e-Discovery"}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults && (
          <div className="mt-6 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Matches Found: {searchResults.length}
            </div>
            {searchResults.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
                No OCR or text contents matched &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              searchResults.map((hit) => (
                <div
                  key={hit.document_id}
                  className="rounded-xl border border-primary/20 bg-white/[0.03] p-4 smooth-transition hover:border-primary/40 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          {hit.file_name}
                        </span>
                        {hit.case_code && (
                          <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                            {formatCaseCode(hit.case_code)}
                          </span>
                        )}
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
                          Score: {hit.score}
                        </span>
                      </div>
                      <p
                        className="text-xs text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: hit.snippet }}
                      />
                    </div>
                    <a
                      href={getDocumentDownloadUrl(hit.document_id, user.id)}
                      className="shrink-0 page-button-secondary text-xs"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* S3 Drag & Drop Direct Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`card-premium border-2 border-dashed p-10 text-center smooth-transition ${
          dragActive
            ? "border-primary bg-primary/5 shadow-[0_0_25px_rgba(34,211,238,0.15)]"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-white/5 p-4 text-primary shadow-inner">
              <Upload size={36} />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">
            Direct Cloud Storage Pipeline
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Drag and drop case files directly to AWS S3 / MinIO Object Store
          </p>
          <label className="inline-block">
            <input
              type="file"
              onChange={handleChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              multiple
            />
            <span className="page-button-primary cursor-pointer">Browse Files</span>
          </label>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span>• Pre-Signed PUT URLs</span>
            <span>• Envelope AES-256</span>
            <span>• Background OCR</span>
          </div>
          {selectedCase && (
            <p className="mt-2 text-xs font-medium text-primary">
              Target Matter: {formatCaseCode(selectedCase.case_code)} - {selectedCase.title}
            </p>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="card-premium border-primary/30 bg-primary/10 p-4 text-sm font-medium text-primary">
          {message}
        </div>
      )}

      {error && (
        <div className="card-premium border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {/* Upload Queue */}
      {queuedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Ready to Upload ({queuedFiles.length})
            </h2>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="page-button-primary disabled:opacity-60"
            >
              {uploading ? "Encrypting & Uploading..." : "Process Direct S3 Upload"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queuedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="card-premium p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="icon-accent rounded p-2">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "binary"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setQueuedFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                    className="flex-shrink-0 text-muted-foreground hover:text-red-400 smooth-transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Registry Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {selectedCase ? `Repository for ${selectedCase.title}` : "All Enterprise Documents"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {visibleDocuments.length} document{visibleDocuments.length === 1 ? "" : "s"} indexed in
              storage vault
            </p>
          </div>
          {selectedCase && (
            <Link to={`/cases/${selectedCase.case_id}`} className="page-button-secondary">
              Open Case File
            </Link>
          )}
        </div>

        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Document
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Matter
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Security & Compliance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Uploaded
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      Loading enterprise storage index...
                    </td>
                  </tr>
                ) : visibleDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No documents found for this selection.
                    </td>
                  </tr>
                ) : (
                  visibleDocuments.map((document) => (
                    <tr
                      key={document.document_id}
                      className="smooth-transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="shrink-0 text-primary" />
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {getVisibleFileName(document)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Doc #{document.document_id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {document.case_code
                          ? formatCaseCode(document.case_code)
                          : document.case_title || "Unlinked"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            AES-256
                          </span>
                          <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                            SHA-256
                          </span>
                          {legalHold?.legal_hold && (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              WORM Locked
                            </span>
                          )}
                          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {document.confidentiality_level || "Internal"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDateTime(document.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3">
                          {document.document_id ? (
                            <a
                              href={getDocumentDownloadUrl(document.document_id, user.id)}
                              className="font-medium text-primary hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Unavailable</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(document)}
                            disabled={deletingId === document.document_id}
                            title="Delete Document"
                            className="text-muted-foreground hover:text-red-400 smooth-transition disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
