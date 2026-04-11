import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

import { formatCaseCode, formatDateTime } from "../lib/format";
import {
  getCases,
  getDocuments,
  resolveFileUrl,
  type CaseRecord,
  type DocumentRecord,
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

  useEffect(() => {
    let active = true;

    Promise.all([getCases(user.id), getDocuments(user.id)])
      .then(([caseData, documentData]) => {
        if (!active) {
          return;
        }

        setCases(caseData);
        setDocuments(documentData);
        setCaseId((current) => current || String(caseData[0]?.case_id ?? ""));
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

  const selectedCase = useMemo(
    () => cases.find((caseItem) => String(caseItem.case_id) === caseId) ?? null,
    [caseId, cases],
  );

  const visibleDocuments = useMemo(() => {
    if (!caseId) {
      return documents;
    }

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
    if (!files?.length) {
      return;
    }

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

  const handleUpload = async () => {
    if (!queuedFiles.length) {
      setError("Choose at least one file before uploading.");
      return;
    }

    if (!caseId) {
      setError("Select a case before uploading documents.");
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
        `Uploaded ${queuedFiles.length} file${queuedFiles.length > 1 ? "s" : ""} to ${
          selectedCase?.title || `case #${caseId}`
        }.`,
      );
      setQueuedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Documents
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Upload files, review matter-specific documents, and download seeded records.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <select
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          className="page-select"
        >
          <option value="">Select case</option>
          {cases.map((caseItem) => (
            <option key={caseItem.case_id} value={caseItem.case_id}>
              {formatCaseCode(caseItem.case_code, `Matter #${caseItem.case_id}`)} -{" "}
              {caseItem.title || "Untitled matter"}
            </option>
          ))}
        </select>

        <select
          value={confidentiality}
          onChange={(event) => setConfidentiality(event.target.value)}
          className="page-select"
        >
          <option value="Internal">Internal</option>
          <option value="Confidential">Confidential</option>
          <option value="Highly Confidential">Highly Confidential</option>
        </select>
      </div>

      <div className="mb-12">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`card-premium border-2 border-dashed p-12 text-center smooth-transition ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-white/5 hover:border-white/10"
          }`}
        >
          <div className="mx-auto max-w-sm">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-white/5 p-4 text-primary">
                <Upload size={32} />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">
              Drag and drop your documents
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">or</p>
            <label className="inline-block">
              <input
                type="file"
                onChange={handleChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
              />
              <span className="page-button-secondary cursor-pointer">
                Browse Files
              </span>
            </label>
            <p className="mt-4 text-xs text-muted-foreground">
              PDF, DOC, DOCX, XLS, TXT up to your backend limits
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Target matter: {selectedCase?.title || "Choose a case first"}
            </p>
          </div>
        </div>
      </div>

      {message ? (
        <div className="mb-6 card-premium p-4 text-sm text-primary">{message}</div>
      ) : null}

      {error ? (
        <div className="mb-6 card-premium p-4 text-sm text-red-300">{error}</div>
      ) : null}

      {queuedFiles.length > 0 ? (
        <div className="mb-12">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-foreground">Ready to Upload</h2>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="page-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload to Register"}
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
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
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
                    className="flex-shrink-0 text-muted-foreground hover:text-primary smooth-transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {selectedCase ? `Documents for ${selectedCase.title}` : "All Documents"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {visibleDocuments.length} visible document{visibleDocuments.length === 1 ? "" : "s"}
          </p>
        </div>
        {selectedCase ? (
          <Link to={`/cases/${selectedCase.case_id}`} className="page-button-secondary">
            Open Case File
          </Link>
        ) : null}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Case
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Confidentiality
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Upload Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Loading documents...
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
                        <FileText size={18} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {getVisibleFileName(document)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                      {document.case_code
                        ? formatCaseCode(document.case_code)
                        : document.case_title || "Unlinked"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                      {document.confidentiality_level || "Internal"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                      {formatDateTime(document.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {document.file_url ? (
                        <a
                          href={resolveFileUrl(document.file_url) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:opacity-70 smooth-transition"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
