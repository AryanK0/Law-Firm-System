import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, FileText, ArrowRight, Loader2, AlertCircle, X, BookOpen, Scale } from "lucide-react";
import { useToast } from "../components/ToastProvider";

interface SearchResult {
  id: number;
  title: string;
  excerpt: string;
  score: number;
  case_code?: string;
  doc_type?: string;
  uploaded_at?: string;
  source: "document" | "case";
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  summary?: string;
  total: number;
}

const EXAMPLE_QUERIES = [
  "arbitration clause in merger agreement",
  "breach of fiduciary duty allegations",
  "settlement terms and confidentiality",
  "intellectual property assignment",
  "indemnification provisions",
];

async function searchDocuments(query: string): Promise<SearchResponse> {
  const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/search`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: 8 }),
  });
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  return resp.json();
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#38bdf8" : "#f59e0b";
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {pct}% match
    </span>
  );
}

export default function AISearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { info, error: toastError } = useToast();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleSearch(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await searchDocuments(searchQuery);
      setResponse(data);
      info("Search complete", `Found ${data.total} relevant documents`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      toastError("Search failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2563eb,#0ea5e9)", boxShadow: "0 0 20px rgba(37,99,235,0.4)" }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Legal Search</h1>
            <p className="text-xs text-slate-500">Semantic search across all documents and matters</p>
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-3.5 transition-all duration-200"
          style={{
            background: "rgba(6,13,28,0.7)",
            border: "1px solid rgba(56,189,248,0.16)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Describe what you're looking for in natural language…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setResponse(null); setError(null); }} className="text-slate-600 hover:text-slate-300">
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#2563eb,#0ea5e9)", boxShadow: "0 0 16px rgba(37,99,235,0.35)" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Search
          </button>
        </div>

        {/* Example queries */}
        {!response && !loading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-600 self-center">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuery(q); handleSearch(q); }}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-150 hover:text-sky-300"
                style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)", color: "#64748b" }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(56,189,248,0.2)" }}
          >
            <Loader2 size={20} className="text-sky-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-300 font-medium">Analyzing documents with AI…</p>
            <p className="text-xs text-slate-600 mt-1">Running semantic similarity search</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 mb-6"
          style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)" }}
        >
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Search unavailable</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            <p className="text-xs text-slate-500 mt-1">The AI search service may not be connected. Check backend status.</p>
          </div>
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <div>
          {/* Summary */}
          {response.summary && (
            <div
              className="mb-5 rounded-xl p-4"
              style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(56,189,248,0.12)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-sky-400" />
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">AI Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{response.summary}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              <span className="text-white font-semibold">{response.total}</span> results for{" "}
              <span className="text-sky-400 italic">"{response.query}"</span>
            </p>
          </div>

          <div className="space-y-3">
            {response.results.map((result) => {
              const Icon = result.source === "case" ? Scale : FileText;
              const accent = result.source === "case" ? "#3b82f6" : "#0ea5e9";
              return (
                <div
                  key={`${result.source}-${result.id}`}
                  className="rounded-xl p-4 transition-all duration-200 hover:translate-y-[-1px] cursor-pointer group"
                  style={{
                    background: "rgba(6,13,28,0.6)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    backdropFilter: "blur(12px)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)"; }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}
                      >
                        <Icon size={14} style={{ color: accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold text-white truncate">{result.title}</h3>
                          {result.case_code && (
                            <span className="text-[10px] font-mono text-slate-500">{result.case_code}</span>
                          )}
                          {result.doc_type && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: "rgba(56,189,248,0.08)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.15)" }}
                            >
                              {result.doc_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{result.excerpt}</p>
                        {result.uploaded_at && (
                          <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                            {new Date(result.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <ScoreBadge score={result.score} />
                      <ArrowRight size={13} className="text-slate-600 group-hover:text-sky-400 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {response.results.length === 0 && (
            <div className="text-center py-16">
              <BookOpen size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No documents found matching this query</p>
              <p className="text-xs text-slate-600 mt-1">Try different keywords or upload more documents</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!response && !loading && !error && (
        <div className="text-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(56,189,248,0.14)" }}
          >
            <Sparkles size={24} className="text-sky-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-2">Semantic Legal Search</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Search through all uploaded documents and case files using natural language. Powered by AI embeddings for context-aware results.
          </p>
        </div>
      )}
    </div>
  );
}
