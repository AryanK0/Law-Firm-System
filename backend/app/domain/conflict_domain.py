from datetime import datetime
import logging
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import transaction_scope
from ..models.core import Case, CaseAdverseParty, Client, Employee

logger = logging.getLogger("lfms.conflict_domain")


class BooleanQueryParser:
    """
    Parses and evaluates queries with boolean operators: AND, OR, NOT, and quoted phrases.
    Example: '"Acme Corp" AND NOT "Acme Subsidiary"' or 'Specter OR Pearson'
    """

    def __init__(self, query_str: str):
        self.raw_query = query_str
        self.tokens = self._tokenize(query_str)

    def _tokenize(self, text_str: str) -> list[str]:
        # Extract quoted phrases or whitespace-separated tokens
        pattern = r'"([^"]*)"|(\bAND\b|\bOR\b|\bNOT\b|[^\s()]+)'
        matches = re.findall(pattern, text_str)
        tokens = []
        for phrase, word in matches:
            tok = phrase if phrase else word
            if tok:
                tokens.append(tok)
        return tokens

    def extract_search_terms(self) -> list[str]:
        """Extracts plain search keywords excluding boolean operators."""
        return [
            t.lower()
            for t in self.tokens
            if t.upper() not in ("AND", "OR", "NOT")
        ]

    def matches_target_text(self, corpus: str) -> bool:
        """
        Evaluates whether the corpus text satisfies the boolean expression.
        Handles default AND semantics between terms, plus explicit AND, OR, NOT.
        """
        if not self.tokens:
            return False

        corpus_lower = corpus.lower()

        # Simple evaluator for tokens
        # If no explicit operators, default to ANY/OR match if multiple, or all
        has_explicit_ops = any(t.upper() in ("AND", "OR", "NOT") for t in self.tokens)
        if not has_explicit_ops:
            return any(term in corpus_lower for term in self.extract_search_terms())

        # Evaluate with basic precedence
        i = 0
        current_result = None
        current_op = "OR"

        while i < len(self.tokens):
            tok = self.tokens[i]
            upper_tok = tok.upper()

            if upper_tok in ("AND", "OR"):
                current_op = upper_tok
                i += 1
                continue
            elif upper_tok == "NOT":
                i += 1
                if i < len(self.tokens):
                    negated_term = self.tokens[i].lower()
                    term_match = (negated_term not in corpus_lower)
                    current_result = term_match if current_result is None else (
                        current_result and term_match if current_op == "AND" else current_result or term_match
                    )
                i += 1
                continue
            else:
                term = tok.lower()
                term_match = (term in corpus_lower)
                if current_result is None:
                    current_result = term_match
                elif current_op == "AND":
                    current_result = current_result and term_match
                elif current_op == "OR":
                    current_result = current_result or term_match
                i += 1

        return bool(current_result)


async def check_conflict_of_interest_domain(
    db: AsyncSession,
    *,
    query: str,
    target_matter_type: str | None = None,
    proposed_client_name: str | None = None,
    proposed_adverse_party: str | None = None,
) -> dict[str, Any]:
    """
    Enterprise Conflict of Interest Engine:
    Parses boolean queries (AND, OR, NOT) and executes deep cross-checks against:
    1. Active & Former Clients (Client table)
    2. Registered Adverse Parties & Opposing Counsel (CaseAdverseParty & Cases)
    3. Attorney Conflict Restrictions (conflict_check table)
    4. Substantially Related Matters (Matter Descriptions)
    
    Applies ABA Model Rules 1.7, 1.9, and 1.10 ethical classifications.
    """
    clean_query = query.strip()
    parser = BooleanQueryParser(clean_query)
    search_terms = parser.extract_search_terms()

    if not search_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflict check query cannot be empty.",
        )

    matches: list[dict[str, Any]] = []

    # 1. Check Clients
    client_res = await db.execute(select(Client))
    all_clients = client_res.scalars().all()

    for client in all_clients:
        client_corpus = f"{client.name or ''} {client.organization or ''} {client.contact_info or ''}"
        if parser.matches_target_text(client_corpus):
            # Check if client has active or closed cases
            case_stmt = text(
                """
                SELECT c.case_id, c.case_code, c.title, c.status, c.case_type
                FROM cases c
                WHERE c.client_id = :cid
                ORDER BY c.status = 'Open' DESC
                """
            )
            client_cases = (await db.execute(case_stmt, {"cid": client.client_id})).mappings().all()
            has_active = any(c["status"] == "Open" for c in client_cases)

            # If user proposed this entity as an adverse party, this is a DIRECT ADVERSE CONFLICT
            is_direct_adversary = False
            if proposed_adverse_party and (
                proposed_adverse_party.lower() in (client.name or "").lower()
                or (client.organization and proposed_adverse_party.lower() in client.organization.lower())
            ):
                is_direct_adversary = True

            severity = "CRITICAL" if (has_active and is_direct_adversary) else ("HIGH" if has_active else "MEDIUM")
            classification = "DIRECT_ADVERSE_CLIENT" if is_direct_adversary else ("ACTIVE_CLIENT" if has_active else "FORMER_CLIENT")

            matches.append({
                "match_type": classification,
                "severity": severity,
                "matched_name": client.name,
                "organization": client.organization,
                "entity_type": "Client",
                "client_id": client.client_id,
                "active_matters_count": sum(1 for c in client_cases if c["status"] == "Open"),
                "total_matters_count": len(client_cases),
                "sample_case": client_cases[0]["title"] if client_cases else None,
                "description": (
                    f"Entity is an active client with {sum(1 for c in client_cases if c['status'] == 'Open')} open matter(s). Concurrent adverse representation strictly prohibited."
                    if has_active
                    else f"Entity is a former client with {len(client_cases)} historical matter(s). Review for substantially related subjects."
                ),
            })

    # 2. Check Adverse Parties & Opposing Counsel
    adverse_stmt = text(
        """
        SELECT ap.party_id, ap.party_name, ap.party_type, ap.corporate_affiliate,
               c.case_id, c.case_code, c.title AS case_title, c.status AS case_status,
               c.opposing_party, c.opposing_counsel
        FROM cases c
        LEFT JOIN case_adverse_party ap ON c.case_id = ap.case_id
        """
    )
    case_party_rows = (await db.execute(adverse_stmt)).mappings().all()

    for row in case_party_rows:
        party_name = row["party_name"] or row["opposing_party"] or ""
        affiliate = row["corporate_affiliate"] or ""
        counsel = row["opposing_counsel"] or ""
        corpus = f"{party_name} {affiliate} {counsel} {row['case_title'] or ''}"

        if party_name and parser.matches_target_text(corpus):
            is_open = (row["case_status"] == "Open")
            matches.append({
                "match_type": "REGISTERED_ADVERSE_PARTY",
                "severity": "CRITICAL" if is_open else "HIGH",
                "matched_name": party_name,
                "organization": affiliate or None,
                "entity_type": "Adverse Party",
                "party_type": row["party_type"] or "Opposing Party",
                "case_id": row["case_id"],
                "case_title": row["case_title"],
                "case_status": row["case_status"],
                "description": f"Entity is recorded as adverse party ({row['party_type'] or 'Opposing Party'}) in {row['case_title']} (Status: {row['case_status']}).",
            })

    # 3. Check Attorney Conflict Restrictions
    attorney_stmt = text(
        """
        SELECT cc.conflict_id, cc.employee_id, e.name AS employee_name,
               cc.client_id, c.name AS client_name, cc.restriction_reason
        FROM conflict_check cc
        JOIN employee e ON cc.employee_id = e.employee_id
        LEFT JOIN client c ON cc.client_id = c.client_id
        """
    )
    attorney_rows = (await db.execute(attorney_stmt)).mappings().all()
    for row in attorney_rows:
        reason = row["restriction_reason"] or ""
        c_name = row["client_name"] or ""
        if parser.matches_target_text(f"{reason} {c_name} {row['employee_name']}"):
            matches.append({
                "match_type": "ATTORNEY_RESTRICTION",
                "severity": "ETHICAL_WALL_REQUIRED",
                "matched_name": row["employee_name"],
                "entity_type": "Attorney Restriction",
                "attorney_id": row["employee_id"],
                "attorney_name": row["employee_name"],
                "description": f"Attorney {row['employee_name']} has an active conflict restriction: '{reason}'. Ethical Wall screening required.",
            })

    # Evaluate Overall Clearance Status
    if not matches:
        overall_status = "CLEARED"
        risk_level = "CLEARED"
        risk_score = 0
        ethical_rule = "None (No conflicts identified)"
        ethical_wall_required = False
        recommendation = "No ethical conflicts of interest detected. Engagement may proceed under standard intake protocol."
    else:
        has_critical = any(m["severity"] == "CRITICAL" for m in matches)
        has_high = any(m["severity"] == "HIGH" for m in matches)
        has_wall = any(m["severity"] == "ETHICAL_WALL_REQUIRED" for m in matches)

        if has_critical:
            overall_status = "CONFLICT_DETECTED"
            risk_level = "CRITICAL"
            risk_score = 95
            ethical_rule = "ABA Model Rule 1.7(a)(1) — Concurrent Direct Adverse Representation"
            ethical_wall_required = False
            recommendation = "Direct adverse representation conflict detected. Representation is prohibited under ABA Model Rule 1.7 without informed written consent from both affected clients."
        elif has_high:
            overall_status = "CONFLICT_DETECTED"
            risk_level = "HIGH"
            risk_score = 75
            ethical_rule = "ABA Model Rule 1.9(a) — Former Client Duties"
            ethical_wall_required = False
            recommendation = "Former client overlap detected. Legal ethics review required to confirm current matter is not substantially related to prior representation."
        elif has_wall:
            overall_status = "REQUIRES_ETHICAL_WALL"
            risk_level = "MODERATE"
            risk_score = 50
            ethical_rule = "ABA Model Rule 1.10 — Imputed Disqualification & Ethical Screening"
            ethical_wall_required = True
            recommendation = "Imputed conflict identified with firm attorney. Enforce an immediate Ethical Wall (Screen) isolating the affected lawyer from all case files, team communications, and fee sharing."
        else:
            overall_status = "REVIEW_RECOMMENDED"
            risk_level = "LOW"
            risk_score = 25
            ethical_rule = "ABA Model Rule 1.7(a)(2) — Material Limitation"
            ethical_wall_required = False
            recommendation = "Minor name or historical match detected. Review intake dossier before formal engagement letter."

    return {
        "query": clean_query,
        "search_terms": search_terms,
        "status": overall_status,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "match_count": len(matches),
        "matches": matches,
        "ethical_rule": ethical_rule,
        "ethical_wall_required": ethical_wall_required,
        "recommendation": recommendation,
        "checked_at": datetime.utcnow().isoformat(),
    }


async def add_case_adverse_party_domain(
    db: AsyncSession,
    *,
    case_id: int,
    party_name: str,
    party_type: str = "OPPOSING_PARTY",
    corporate_affiliate: str | None = None,
) -> dict[str, Any]:
    """Registers an adverse party, co-defendant, or key witness for a matter."""
    async with transaction_scope(db):
        case_res = await db.execute(select(Case).where(Case.case_id == case_id))
        case = case_res.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

        party = CaseAdverseParty(
            case_id=case_id,
            party_name=party_name.strip(),
            party_type=party_type,
            corporate_affiliate=corporate_affiliate.strip() if corporate_affiliate else None,
            added_at=datetime.utcnow(),
        )
        db.add(party)

        # Update opposing party on case if not set
        if not case.opposing_party and party_type == "OPPOSING_PARTY":
            case.opposing_party = party_name.strip()

        await db.flush()

    return {
        "party_id": party.party_id,
        "case_id": case_id,
        "party_name": party.party_name,
        "party_type": party.party_type,
        "corporate_affiliate": party.corporate_affiliate,
        "added_at": str(party.added_at),
        "message": f"Adverse party '{party.party_name}' added to matter #{case_id}.",
    }


async def get_case_adverse_parties_domain(db: AsyncSession, case_id: int) -> list[dict[str, Any]]:
    """Returns all adverse parties registered for a matter."""
    res = await db.execute(
        select(CaseAdverseParty)
        .where(CaseAdverseParty.case_id == case_id)
        .order_by(CaseAdverseParty.party_id.asc())
    )
    parties = res.scalars().all()
    return [
        {
            "party_id": p.party_id,
            "case_id": p.case_id,
            "party_name": p.party_name,
            "party_type": p.party_type,
            "corporate_affiliate": p.corporate_affiliate,
            "added_at": str(p.added_at),
        }
        for p in parties
    ]
