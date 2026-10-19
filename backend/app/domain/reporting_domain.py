from datetime import datetime
from typing import Any

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import transaction_scope


async def generate_case_reports_domain(db: AsyncSession) -> list[dict[str, Any]]:
    """
    Eradicates MySQL sp_generate_case_report CURSOR FOR loop!
    Computes reporting metrics in a single set-based asynchronous aggregation query.
    """
    # 1. Asynchronous set-based aggregation query replacing the cursor loop
    agg_stmt = text(
        """
        SELECT
            c.case_id,
            COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) as case_code,
            COALESCE(c.title, 'Untitled case') as title,
            COALESCE(b.total_billing, 0.00) as total_billing,
            COALESCE(t.total_hours, 0.00) as total_hours,
            COALESCE(d.doc_count, 0) as document_count,
            COALESCE(h.hearing_count, 0) as hearing_count,
            COALESCE(tm.team_count, 0) as team_size
        FROM cases c
        LEFT JOIN (
            SELECT case_id, SUM(amount) as total_billing
            FROM billing
            GROUP BY case_id
        ) b ON c.case_id = b.case_id
        LEFT JOIN (
            SELECT case_id, SUM(hours) as total_hours
            FROM time_log
            GROUP BY case_id
        ) t ON c.case_id = t.case_id
        LEFT JOIN (
            SELECT case_id, COUNT(*) as doc_count
            FROM document
            GROUP BY case_id
        ) d ON c.case_id = d.case_id
        LEFT JOIN (
            SELECT case_id, COUNT(*) as hearing_count
            FROM hearing
            GROUP BY case_id
        ) h ON c.case_id = h.case_id
        LEFT JOIN (
            SELECT case_id, COUNT(*) as team_count
            FROM case_team
            GROUP BY case_id
        ) tm ON c.case_id = tm.case_id
        WHERE c.status <> 'Closed'
        ORDER BY c.case_id ASC
        """
    )
    res = await db.execute(agg_stmt)
    rows = res.mappings().all()

    now = datetime.utcnow()
    report_rows = []
    insert_data = []

    for r in rows:
        summary = (
            f"{r['case_code']} | {r['title']} | "
            f"hearings={r['hearing_count']}, team_size={r['team_size']}, documents={r['document_count']}"
        )
        insert_data.append({
            "case_id": r["case_id"],
            "summary": summary,
            "total_billing": float(r["total_billing"]),
            "total_hours": float(r["total_hours"]),
            "document_count": int(r["document_count"]),
            "generated_at": now,
        })
        report_rows.append({
            "report_id": r["case_id"],
            "case_id": r["case_id"],
            "case_code": r["case_code"],
            "title": r["title"],
            "summary": summary,
            "total_billing": float(r["total_billing"]),
            "total_hours": float(r["total_hours"]),
            "document_count": int(r["document_count"]),
            "generated_at": str(now),
        })

    # Bulk sync Case_Report table in an atomic transaction
    async with transaction_scope(db):
        await db.execute(text("DELETE FROM case_report"))
        if insert_data:
            insert_stmt = text(
                """
                INSERT INTO case_report (case_id, summary, total_billing, total_hours, document_count, generated_at)
                VALUES (:case_id, :summary, :total_billing, :total_hours, :document_count, :generated_at)
                """
            )
            await db.execute(insert_stmt, insert_data)

    return report_rows


async def generate_employee_workload_reports_domain(db: AsyncSession) -> list[dict[str, Any]]:
    """
    Eradicates MySQL sp_generate_employee_workload_report CURSOR FOR loop!
    Computes employee workload using set-based GROUP BY aggregation.
    """
    agg_stmt = text(
        """
        SELECT
            e.employee_id,
            e.name,
            COALESCE(ct.active_cases, 0) as active_cases,
            COALESCE(tl.total_hours, 0.00) as total_hours,
            COALESCE(tk.tickets_raised, 0) as tickets_raised
        FROM employee e
        LEFT JOIN (
            SELECT ct.employee_id, COUNT(DISTINCT c.case_id) as active_cases
            FROM case_team ct
            JOIN cases c ON ct.case_id = c.case_id
            WHERE c.status <> 'Closed'
            GROUP BY ct.employee_id
        ) ct ON e.employee_id = ct.employee_id
        LEFT JOIN (
            SELECT employee_id, SUM(hours) as total_hours
            FROM time_log
            GROUP BY employee_id
        ) tl ON e.employee_id = tl.employee_id
        LEFT JOIN (
            SELECT raised_by, COUNT(*) as tickets_raised
            FROM ticket
            GROUP BY raised_by
        ) tk ON e.employee_id = tk.raised_by
        WHERE e.status = 'Active'
        ORDER BY e.employee_id ASC
        """
    )
    res = await db.execute(agg_stmt)
    rows = res.mappings().all()

    now = datetime.utcnow()
    report_rows = []
    insert_data = []

    for r in rows:
        summary = (
            f"{r['name']} | active_cases={r['active_cases']}, "
            f"total_hours={float(r['total_hours']):.2f}, tickets_raised={r['tickets_raised']}"
        )
        insert_data.append({
            "employee_id": r["employee_id"],
            "summary": summary,
            "active_cases": int(r["active_cases"]),
            "total_hours": float(r["total_hours"]),
            "tickets_raised": int(r["tickets_raised"]),
            "generated_at": now,
        })
        report_rows.append({
            "report_id": r["employee_id"],
            "employee_id": r["employee_id"],
            "name": r["name"],
            "summary": summary,
            "active_cases": int(r["active_cases"]),
            "total_hours": float(r["total_hours"]),
            "tickets_raised": int(r["tickets_raised"]),
            "generated_at": str(now),
        })

    async with transaction_scope(db):
        await db.execute(text("DELETE FROM employee_report"))
        if insert_data:
            insert_stmt = text(
                """
                INSERT INTO employee_report (employee_id, summary, active_cases, total_hours, tickets_raised, generated_at)
                VALUES (:employee_id, :summary, :active_cases, :total_hours, :tickets_raised, :generated_at)
                """
            )
            await db.execute(insert_stmt, insert_data)

    return report_rows


async def generate_ticket_reports_domain(db: AsyncSession) -> list[dict[str, Any]]:
    """
    Eradicates MySQL sp_generate_ticket_report CURSOR FOR loop!
    Calculates SLA status and generates ticket reports asynchronously.
    """
    agg_stmt = text(
        """
        SELECT
            t.ticket_id,
            t.priority,
            t.assigned_to,
            t.resolution_deadline,
            t.created_at,
            CASE
                WHEN t.status = 'Resolved' THEN 'Resolved'
                WHEN t.resolution_deadline IS NULL THEN 'No SLA Set'
                WHEN NOW() > t.resolution_deadline THEN 'Breached'
                WHEN TIMESTAMPDIFF(HOUR, NOW(), t.resolution_deadline) <= 12 THEN 'Approaching Breach'
                ELSE 'Within SLA'
            END as sla_status
        FROM ticket t
        WHERE t.status <> 'Resolved'
        ORDER BY (t.resolution_deadline IS NULL), t.resolution_deadline ASC, t.ticket_id ASC
        """
    )
    res = await db.execute(agg_stmt)
    rows = res.mappings().all()

    now = datetime.utcnow()
    report_rows = []
    insert_data = []

    for r in rows:
        summary = f"Ticket #{r['ticket_id']} | priority={r['priority']}, SLA={r['sla_status']}"
        insert_data.append({
            "ticket_id": r["ticket_id"],
            "summary": summary,
            "sla_status": r["sla_status"],
            "priority": r["priority"],
            "assigned_to": r["assigned_to"],
            "generated_at": now,
        })
        report_rows.append({
            "report_id": r["ticket_id"],
            "ticket_id": r["ticket_id"],
            "summary": summary,
            "sla_status": r["sla_status"],
            "priority": r["priority"],
            "assigned_to": r["assigned_to"],
            "generated_at": str(now),
        })

    async with transaction_scope(db):
        await db.execute(text("DELETE FROM ticket_report"))
        if insert_data:
            insert_stmt = text(
                """
                INSERT INTO ticket_report (ticket_id, summary, sla_status, priority, assigned_to, generated_at)
                VALUES (:ticket_id, :summary, :sla_status, :priority, :assigned_to, :generated_at)
                """
            )
            await db.execute(insert_stmt, insert_data)

    return report_rows
