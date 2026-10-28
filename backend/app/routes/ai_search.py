"""
Semantic RAG search endpoint.
Uses sentence-transformers (all-MiniLM-L6-v2) for free, fully-local
embeddings + cosine similarity over an in-memory index built from the
document register and case records.

Falls back gracefully if sentence-transformers is not installed.
"""

import logging
import math
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import fetch_all, fetch_one  # synchronous helpers

logger = logging.getLogger("lfms.ai_search")
router = APIRouter(tags=["AI Search"])

# ── Optional ML imports (Lazy loaded) ──────────────────────────────────────────
_EMBED_MODEL = None
_EMBED_LOAD_ATTEMPTED = False


def _get_embed_model():
    global _EMBED_MODEL, _EMBED_LOAD_ATTEMPTED
    if _EMBED_LOAD_ATTEMPTED:
        return _EMBED_MODEL

    _EMBED_LOAD_ATTEMPTED = True
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model_name = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
        _EMBED_MODEL = SentenceTransformer(model_name)
        logger.info("sentence-transformers loaded: %s", model_name)
    except Exception as exc:
        _EMBED_MODEL = None
        logger.info("sentence-transformers unavailable (%s); using keyword fallback.", exc)

    return _EMBED_MODEL


try:
    import numpy as np  # type: ignore
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


# ── In-memory index state ─────────────────────────────────────────────────────
_INDEX_READY = False
_INDEX_DOCS: list[dict[str, Any]] = []   # metadata
_INDEX_VECS: Any = None                   # numpy ndarray


class SearchRequest(BaseModel):
    query: str
    top_k: int = 8


class SearchResultItem(BaseModel):
    id: int
    title: str
    excerpt: str
    score: float
    case_code: str | None = None
    doc_type: str | None = None
    uploaded_at: str | None = None
    source: str  # "document" | "case"


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    summary: str | None = None
    total: int


# ── Index builder ─────────────────────────────────────────────────────────────

def _build_index() -> None:
    global _INDEX_DOCS, _INDEX_VECS, _INDEX_READY

    docs: list[dict[str, Any]] = []

    # 1. Documents
    try:
        rows = fetch_all(
            """
            SELECT document_id, case_id, file_name, case_code,
                   case_title, confidentiality_level, created_at
            FROM vw_document_register
            ORDER BY created_at DESC
            LIMIT 500
            """,
        )
        for r in rows:
            title = r.get("file_name") or r.get("case_title") or "Untitled Document"
            doc_type = r.get("confidentiality_level", "General")
            case_code = r.get("case_code", "")
            case_title = r.get("case_title", "")
            excerpt = (
                f"Document '{title}' filed under matter {case_code} ({case_title}). "
                f"Classification: {doc_type}. Logged {str(r.get('created_at', ''))[:10]}."
            )
            docs.append({
                "id": r["document_id"],
                "title": title,
                "excerpt": excerpt,
                "case_code": case_code,
                "doc_type": doc_type,
                "uploaded_at": str(r.get("created_at", ""))[:10] or None,
                "source": "document",
                "_text": f"{title} {doc_type} {case_code} {case_title} {excerpt}",
            })
    except Exception as exc:
        logger.warning("Could not load documents for index: %s", exc)

    # 2. Cases
    try:
        rows = fetch_all(
            """
            SELECT case_id, case_code, title, case_type, status,
                   description, client_name
            FROM vw_case_overview
            ORDER BY start_date DESC
            LIMIT 300
            """,
        )
        for r in rows:
            title = r.get("title", "Untitled Matter")
            status = r.get("status", "")
            case_type = r.get("case_type", "")
            client = r.get("client_name", "")
            desc = r.get("description", "") or ""
            excerpt = f"{case_type} matter for {client} — {title}. Status: {status}. {desc[:200]}"
            docs.append({
                "id": r["case_id"],
                "title": title,
                "excerpt": excerpt.strip(),
                "case_code": r.get("case_code"),
                "doc_type": case_type or None,
                "uploaded_at": None,
                "source": "case",
                "_text": f"{title} {case_type} {status} {client} {desc}",
            })
    except Exception as exc:
        logger.warning("Could not load cases for index: %s", exc)

    _INDEX_DOCS = docs

    embed_model = _get_embed_model()
    if HAS_NUMPY and embed_model and docs:
        texts = [d["_text"] for d in docs]
        try:
            vecs = embed_model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
            _INDEX_VECS = np.array(vecs, dtype="float32")
            logger.info("Semantic index built: %d documents", len(docs))
        except Exception as exc:
            logger.warning("Embedding failed: %s", exc)
            _INDEX_VECS = None

    _INDEX_READY = True


def _ensure_index() -> None:
    global _INDEX_READY
    if not _INDEX_READY:
        _build_index()


# ── Keyword fallback ───────────────────────────────────────────────────────────

def _keyword_score(text: str, query: str) -> float:
    terms = query.lower().split()
    t = text.lower()
    hits = sum(1 for term in terms if term in t)
    return hits / max(len(terms), 1)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/api/search", response_model=SearchResponse, summary="Semantic AI document search (RAG)")
def semantic_search(req: SearchRequest) -> SearchResponse:
    """
    Semantic search across the document register and case records using
    sentence-transformers embeddings (all-MiniLM-L6-v2).
    Falls back to keyword BM25-style scoring when ML libraries are unavailable.
    """
    _ensure_index()

    if not _INDEX_DOCS:
        return SearchResponse(query=req.query, results=[], total=0,
                              summary="No documents indexed yet. Upload some documents first.")

    top_k = max(1, min(req.top_k, 20))

    embed_model = _get_embed_model()
    if HAS_NUMPY and _INDEX_VECS is not None and embed_model is not None:
        # ── Semantic path ──
        q_vec = embed_model.encode([req.query], normalize_embeddings=True)
        scores = (_INDEX_VECS @ q_vec.T).flatten()
        scored = list(zip(scores.tolist(), _INDEX_DOCS))
    else:
        # ── Keyword fallback ──
        scored = [
            (_keyword_score(d["_text"], req.query), d)
            for d in _INDEX_DOCS
        ]

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [(score, doc) for score, doc in scored[:top_k] if score > 0.05]

    results = [
        SearchResultItem(
            id=doc["id"],
            title=doc["title"],
            excerpt=doc["excerpt"],
            score=round(float(score), 4),
            case_code=doc.get("case_code"),
            doc_type=doc.get("doc_type"),
            uploaded_at=doc.get("uploaded_at"),
            source=doc["source"],
        )
        for score, doc in top
    ]

    summary = None
    if results:
        doc_count = sum(1 for r in results if r.source == "document")
        case_count = sum(1 for r in results if r.source == "case")
        parts = []
        if doc_count:
            parts.append(f"{doc_count} document{'s' if doc_count > 1 else ''}")
        if case_count:
            parts.append(f"{case_count} case matter{'s' if case_count > 1 else ''}")
        summary = (
            f"Found {' and '.join(parts)} most relevant to \"{req.query}\". "
            f"Top result: {results[0].title} ({int(results[0].score * 100)}% match)."
        )

    return SearchResponse(
        query=req.query,
        results=results,
        summary=summary,
        total=len(results),
    )


@router.post("/api/search/reindex", summary="Rebuild the in-memory semantic search index")
def reindex() -> dict[str, str]:
    """Force a full rebuild of the semantic search index."""
    global _INDEX_READY
    _INDEX_READY = False
    _build_index()
    return {"status": "ok", "indexed": str(len(_INDEX_DOCS))}
