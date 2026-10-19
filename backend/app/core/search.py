import io
import logging
import os
import re
import zipfile
from typing import Any
from xml.etree import ElementTree

from pypdf import PdfReader

try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

try:
    from elasticsearch import Elasticsearch
    HAS_ELASTIC = True
except ImportError:
    HAS_ELASTIC = False

logger = logging.getLogger("lfms.search")

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
INDEX_NAME = "lfms_documents"


def extract_document_text(data: bytes, file_name: str) -> str:
    """
    Extracts text from binary payloads using native parsers (pypdf, zipfile/XML)
    and OCR (pytesseract) for scanned documents.
    """
    ext = file_name.lower().split(".")[-1] if "." in file_name else ""
    extracted = []

    # 1. Plain text / Markdown / JSON / CSV
    if ext in ("txt", "md", "csv", "json", "log", "rtf", "xml"):
        try:
            return data.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    # 2. PDF Processing via pypdf
    if ext == "pdf":
        try:
            reader = PdfReader(io.BytesIO(data))
            for page_idx, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    extracted.append(text.strip())
                elif HAS_OCR:
                    # Attempt OCR on embedded page images
                    try:
                        for img in page.images:
                            img_obj = Image.open(io.BytesIO(img.data))
                            ocr_text = pytesseract.image_to_string(img_obj)
                            if ocr_text.strip():
                                extracted.append(ocr_text.strip())
                    except Exception:
                        pass
        except Exception as exc:
            logger.warning("Error extracting text from PDF '%s': %s", file_name, exc)

    # 3. Microsoft Word (.docx) Processing
    elif ext == "docx":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if "word/document.xml" in z.namelist():
                    xml_content = z.read("word/document.xml")
                    tree = ElementTree.fromstring(xml_content)
                    texts = [elem.text for elem in tree.iter() if elem.text]
                    extracted.append(" ".join(texts))
        except Exception as exc:
            logger.warning("Error parsing DOCX '%s': %s", file_name, exc)

    # 4. Microsoft Excel (.xlsx) Processing
    elif ext == "xlsx":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if "xl/sharedStrings.xml" in z.namelist():
                    xml_content = z.read("xl/sharedStrings.xml")
                    tree = ElementTree.fromstring(xml_content)
                    texts = [elem.text for elem in tree.iter() if elem.text]
                    extracted.append(" ".join(texts))
        except Exception as exc:
            logger.warning("Error parsing XLSX '%s': %s", file_name, exc)

    return "\n\n".join(extracted).strip()


class FullTextSearchEngine:
    """
    Elasticsearch enterprise search index with in-memory resilient fallback.
    Provides fast full-text e-Discovery, boolean search, and highlighted snippets.
    """

    def __init__(self):
        self.es_client = None
        self.is_connected = False
        self._fallback_index: dict[int, dict[str, Any]] = {}
        self._init_elasticsearch()

    def _init_elasticsearch(self):
        if not HAS_ELASTIC:
            return
        try:
            self.es_client = Elasticsearch(ELASTICSEARCH_URL, request_timeout=3)
            if self.es_client.ping():
                self.is_connected = True
                self._ensure_index()
                logger.info("Connected to Elasticsearch at %s", ELASTICSEARCH_URL)
            else:
                self.is_connected = False
        except Exception as exc:
            logger.info("Elasticsearch not available (%s). Utilizing resilient full-text search engine.", exc)
            self.is_connected = False

    def _ensure_index(self):
        if not self.is_connected or not self.es_client:
            return
        try:
            if not self.es_client.indices.exists(index=INDEX_NAME):
                mapping = {
                    "mappings": {
                        "properties": {
                            "document_id": {"type": "integer"},
                            "case_id": {"type": "integer"},
                            "case_code": {"type": "keyword"},
                            "case_title": {"type": "text"},
                            "file_name": {"type": "text"},
                            "confidentiality_level": {"type": "keyword"},
                            "extracted_text": {"type": "text", "analyzer": "standard"},
                            "sha256": {"type": "keyword"},
                            "created_at": {"type": "date"},
                        }
                    }
                }
                self.es_client.indices.create(index=INDEX_NAME, body=mapping)
        except Exception as exc:
            logger.warning("Failed ensuring Elasticsearch index: %s", exc)

    async def index_document(
        self,
        *,
        document_id: int,
        case_id: int,
        case_code: str | None,
        case_title: str | None,
        file_name: str,
        confidentiality_level: str,
        extracted_text: str,
        sha256: str | None = None,
        created_at: str | None = None,
    ):
        doc = {
            "document_id": document_id,
            "case_id": case_id,
            "case_code": case_code or f"MATTER-{case_id}",
            "case_title": case_title or "Untitled Case",
            "file_name": file_name,
            "confidentiality_level": confidentiality_level,
            "extracted_text": extracted_text,
            "sha256": sha256 or "",
            "created_at": created_at or "",
        }

        # Keep in local fallback index
        self._fallback_index[document_id] = doc

        if self.is_connected and self.es_client:
            try:
                self.es_client.index(index=INDEX_NAME, id=str(document_id), body=doc)
            except Exception as exc:
                logger.warning("Failed indexing document in Elasticsearch: %s", exc)

    def search_documents(
        self,
        query: str,
        case_id: int | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Full-text e-Discovery search across document register and extracted text.
        """
        query_clean = query.strip().lower()

        # If connected to live Elasticsearch:
        if self.is_connected and self.es_client:
            try:
                must_clauses: list[dict] = [
                    {
                        "multi_match": {
                            "query": query,
                            "fields": ["extracted_text^3", "file_name^2", "case_title", "case_code"],
                        }
                    }
                ]
                if case_id is not None:
                    must_clauses.append({"term": {"case_id": case_id}})

                es_query = {
                    "query": {"bool": {"must": must_clauses}},
                    "highlight": {
                        "fields": {"extracted_text": {"number_of_fragments": 2, "fragment_size": 150}}
                    },
                    "size": limit,
                }
                res = self.es_client.search(index=INDEX_NAME, body=es_query)
                hits = []
                for hit in res.get("hits", {}).get("hits", []):
                    src = hit["_source"]
                    highlight = hit.get("highlight", {}).get("extracted_text", [])
                    snippet = highlight[0] if highlight else (src.get("extracted_text", "")[:160] + "...")
                    hits.append({
                        "document_id": src["document_id"],
                        "case_id": src["case_id"],
                        "case_code": src.get("case_code"),
                        "case_title": src.get("case_title"),
                        "file_name": src["file_name"],
                        "snippet": snippet,
                        "score": hit.get("_score", 1.0),
                    })
                return hits
            except Exception as exc:
                logger.warning("Elasticsearch query failed, falling back to local index: %s", exc)

        # Resilient local fallback search with regex / substring matching & snippet generator
        results = []
        for doc_id, doc in self._fallback_index.items():
            if case_id is not None and doc.get("case_id") != case_id:
                continue

            full_content = (
                f"{doc.get('file_name', '')} {doc.get('case_title', '')} "
                f"{doc.get('case_code', '')} {doc.get('extracted_text', '')}"
            ).lower()

            # Check match
            words = query_clean.split()
            matched_words = [w for w in words if w in full_content]
            if matched_words or query_clean in full_content:
                text = doc.get("extracted_text", "")
                snippet = ""
                # Find occurrence for context
                match_pos = -1
                for w in matched_words:
                    idx = text.lower().find(w)
                    if idx != -1:
                        match_pos = idx
                        break

                if match_pos != -1:
                    start = max(0, match_pos - 60)
                    end = min(len(text), match_pos + 120)
                    snippet = f"...{text[start:end]}..."
                else:
                    snippet = (text[:160] + "...") if text else "Metadata match"

                results.append({
                    "document_id": doc["document_id"],
                    "case_id": doc["case_id"],
                    "case_code": doc.get("case_code"),
                    "case_title": doc.get("case_title"),
                    "file_name": doc["file_name"],
                    "snippet": snippet,
                    "score": len(matched_words) / max(1, len(words)),
                })

        # Sort by relevance score
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]


# Global search engine singleton
search_engine = FullTextSearchEngine()
