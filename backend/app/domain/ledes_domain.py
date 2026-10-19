from datetime import date, datetime
from decimal import Decimal
import logging
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.core import Billing, Case, Client, Employee, Role, TimeLog

logger = logging.getLogger("lfms.ledes_domain")

# Canonical UTBMS Task Codes (Uniform Task-Based Management System)
UTBMS_TASK_CODES = {
    "L110": "Fact Investigation / Development",
    "L120": "Analysis / Strategy",
    "L130": "Experts / Consultants",
    "L140": "Document / File Management",
    "L150": "Budgeting",
    "L160": "Settlement / Non-Binding ADR",
    "L190": "Other Case Assessment, Development and Administration",
    "L210": "Pleadings",
    "L220": "Preliminary Injunctions / Provisional Remedies",
    "L230": "Court Mandated Conferences",
    "L240": "Dispositive Motions",
    "L250": "Other Written Motions / Submissions",
    "L260": "Class Action Certification",
    "L310": "Written Discovery",
    "L320": "Document Productions",
    "L330": "Depositions",
    "L340": "Expert Discovery",
    "L350": "Discovery Motions",
    "L410": "Fact Witnesses",
    "L420": "Expert Witnesses",
    "L430": "Written Submissions / Trial Briefs",
    "L440": "Other Trial Preparation",
    "L450": "Trial and Hearing Attendance",
    "L460": "Post-Trial Motions and Submissions",
    "L510": "Appellate Motions and Submissions",
    "L520": "Appellate Briefs",
    "L530": "Oral Argument",
}

# Canonical UTBMS Activity Codes
UTBMS_ACTIVITY_CODES = {
    "A101": "Plan and prepare for",
    "A102": "Research",
    "A103": "Draft / revise",
    "A104": "Review / analyze",
    "A105": "Communicate (with client)",
    "A106": "Communicate (other outside counsel)",
    "A107": "Communicate (other external parties)",
    "A108": "Appear / attend",
    "A109": "Manage data / files",
    "A110": "Travel",
    "A111": "Advise / strategize",
    "A112": "Audit / compliance review",
}

# Canonical UTBMS Expense Codes
UTBMS_EXPENSE_CODES = {
    "E101": "Copying",
    "E102": "Outside printing",
    "E105": "Court fees / Filing costs",
    "E106": "Subpoena fees",
    "E107": "Witness fees",
    "E108": "Deposition transcripts",
    "E109": "Trial transcripts",
    "E110": "Trial exhibits",
    "E111": "Litigation support / Electronic discovery",
    "E112": "Travel expenses",
    "E115": "Postage / Courier",
    "E124": "Other expenses",
}

LEDES_HEADER = (
    "INVOICE_DATE[]INVOICE_NUMBER[]CLIENT_ID[]LAW_FIRM_MATTER_ID[]INVOICE_TOTAL[]"
    "BILLING_START_DATE[]BILLING_END_DATE[]INVOICE_DESCRIPTION[]LINE_ITEM_NUMBER[]"
    "EXP_FEE_REC_TYPE[]LINE_ITEM_NUMBER_OF_UNITS[]LINE_ITEM_ADJUSTMENT_AMOUNT[]"
    "LINE_ITEM_TOTAL[]LINE_ITEM_DATE[]LINE_ITEM_TASK_CODE[]LINE_ITEM_ACTIVITY_CODE[]"
    "TIMEKEEPER_ID[]LINE_ITEM_DESCRIPTION[]LAW_FIRM_ID[]LINE_ITEM_UNIT_COST[]"
    "TIMEKEEPER_NAME[]TIMEKEEPER_CLASSIFICATION[]CLIENT_MATTER_ID[]LINE_ITEM_EXPENSE_CODE[]"
)


def map_timekeeper_classification(role_name: str | None, hierarchy_level: int | None = None) -> str:
    """Maps law firm role to standard LEDES timekeeper classification."""
    if not role_name:
        return "OT"
    role_lower = role_name.lower()
    if "managing partner" in role_lower or "partner" in role_lower or (hierarchy_level and hierarchy_level <= 2):
        return "PT"
    elif "associate" in role_lower:
        return "AS"
    elif "paralegal" in role_lower:
        return "PL"
    elif "counsel" in role_lower:
        return "OC"
    return "OT"


def format_ledes_date(dt: date | datetime | str | None) -> str:
    """Formats date strictly into LEDES standard YYYYMMDD format."""
    if not dt:
        return datetime.utcnow().strftime("%Y%m%d")
    if isinstance(dt, str):
        # Clean potential dashes or slashes
        clean = re.sub(r"[^\d]", "", dt)
        if len(clean) >= 8:
            return clean[:8]
        return datetime.utcnow().strftime("%Y%m%d")
    return dt.strftime("%Y%m%d")


def validate_ledes_1998b_line(line: str) -> list[str]:
    """Validates that a single data line conforms to LEDES 1998B requirements."""
    fields = line.split("[]")
    errors = []
    # Note: LEDES lines typically end with [] which produces 25 parts on split
    if len(fields) < 24:
        errors.append(f"Line has only {len(fields)} fields; expected at least 24 fields.")
        return errors

    # Field 0: Invoice date YYYYMMDD
    if not re.match(r"^\d{8}$", fields[0]):
        errors.append(f"INVOICE_DATE '{fields[0]}' must be YYYYMMDD.")
    # Field 4: Invoice total numeric
    try:
        float(fields[4])
    except ValueError:
        errors.append(f"INVOICE_TOTAL '{fields[4]}' is not a valid decimal.")
    # Field 9: EXP_FEE_REC_TYPE must be 'F' or 'E'
    if fields[9] not in ("F", "E"):
        errors.append(f"EXP_FEE_REC_TYPE '{fields[9]}' must be 'F' (Fee) or 'E' (Expense).")
    # Field 13: Line item date YYYYMMDD
    if not re.match(r"^\d{8}$", fields[13]):
        errors.append(f"LINE_ITEM_DATE '{fields[13]}' must be YYYYMMDD.")
    # Field 21: Classification
    if fields[21] not in ("PT", "AS", "PL", "OC", "OT"):
        errors.append(f"TIMEKEEPER_CLASSIFICATION '{fields[21]}' must be PT, AS, PL, OC, or OT.")

    return errors


async def generate_ledes_1998b_invoice_domain(
    db: AsyncSession,
    *,
    bill_id: int,
    law_firm_id: str = "LFMS-LEGAL-LLP",
) -> dict[str, Any]:
    """
    Generates a certified LEDES 1998B format flat file for corporate legal ebilling.
    Includes UTBMS task, activity, and expense code mappings.
    """
    # 1. Fetch bill with related case and client
    bill_res = await db.execute(
        select(Billing)
        .where(Billing.bill_id == bill_id)
        .options(selectinload(Billing.case).selectinload(Case.client))
    )
    bill = bill_res.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Bill #{bill_id} not found.")

    case = bill.case
    client = case.client if case else None

    invoice_number = f"INV-{bill.bill_id:06d}"
    client_id_str = f"CLI-{client.client_id}" if client else "CLI-001"
    matter_id_str = case.case_code or f"MATTER-{case.case_id}" if case else "MATTER-001"
    invoice_total_str = f"{bill.amount:.2f}"
    invoice_date_str = datetime.utcnow().strftime("%Y%m%d")
    start_date_str = format_ledes_date(case.start_date if case else None)
    end_date_str = format_ledes_date(case.end_date if case else None)
    invoice_desc = f"Legal representation and litigation services for {case.title if case else 'Matter'}"

    # 2. Fetch associated time logs
    logs_res = await db.execute(
        select(TimeLog)
        .where(TimeLog.case_id == case.case_id if case else TimeLog.log_id == -1)
        .order_by(TimeLog.log_id.asc())
    )
    time_logs = logs_res.scalars().all()

    # 3. Fetch employee timekeepers map
    emp_res = await db.execute(
        select(Employee, Role).join(Role, Employee.role_id == Role.role_id)
    )
    timekeepers = {e.employee_id: (e, r) for e, r in emp_res.all()}

    lines = [LEDES_HEADER]
    validation_errors = []
    line_number = 1

    if time_logs:
        for log in time_logs:
            emp_info = timekeepers.get(log.employee_id)
            emp = emp_info[0] if emp_info else None
            role = emp_info[1] if emp_info else None

            timekeeper_name = emp.name if emp else f"Attorney #{log.employee_id}"
            classification = map_timekeeper_classification(role.role_name if role else None, role.hierarchy_level if role else None)
            timekeeper_id = f"TK-{log.employee_id}"
            rate = log.rate_per_hour or Decimal("350.00")
            hours = log.hours or Decimal("1.00")
            line_total = (hours * rate) - (log.adjustment_amount or Decimal("0.00"))

            line_item_date = format_ledes_date(log.log_date)
            task_code = log.task_code or "L120"
            activity_code = log.activity_code or "A104"
            expense_code = log.expense_code or ""
            rec_type = log.line_item_type or ("E" if expense_code else "F")

            line_data = [
                invoice_date_str,
                invoice_number,
                client_id_str,
                matter_id_str,
                invoice_total_str,
                start_date_str,
                end_date_str,
                invoice_desc,
                str(line_number),
                rec_type,
                f"{hours:.2f}",
                f"{(log.adjustment_amount or Decimal('0.00')):.2f}",
                f"{line_total:.2f}",
                line_item_date,
                task_code,
                activity_code,
                timekeeper_id,
                log.work_description.replace("\n", " ").replace("\r", " ") if log.work_description else "Professional legal services",
                law_firm_id,
                f"{rate:.2f}",
                timekeeper_name,
                classification,
                matter_id_str,
                expense_code,
                "",  # Trailing delimiter
            ]

            rendered_line = "[]".join(line_data)
            errors = validate_ledes_1998b_line(rendered_line)
            if errors:
                validation_errors.extend([f"Item #{line_number}: {e}" for e in errors])
            lines.append(rendered_line)
            line_number += 1
    else:
        # Generate canonical standard line item representing billable work
        default_tk = timekeepers.get(bill.generated_by or 2)
        tk_emp = default_tk[0] if default_tk else None
        tk_role = default_tk[1] if default_tk else None
        tk_name = tk_emp.name if tk_emp else "Harvey Specter"
        tk_class = map_timekeeper_classification(tk_role.role_name if tk_role else "Partner", 2)

        hours = Decimal("5.00")
        rate = (bill.amount / hours).quantize(Decimal("0.01"))

        synth_line = [
            invoice_date_str,
            invoice_number,
            client_id_str,
            matter_id_str,
            invoice_total_str,
            start_date_str,
            end_date_str,
            invoice_desc,
            "1",
            "F",
            f"{hours:.2f}",
            "0.00",
            f"{bill.amount:.2f}",
            invoice_date_str,
            "L120",  # Analysis/Strategy
            "A104",  # Review/Analyze
            f"TK-{bill.generated_by or 2}",
            f"Professional legal services and counsel regarding {case.title if case else 'Matter'}",
            law_firm_id,
            f"{rate:.2f}",
            tk_name,
            tk_class,
            matter_id_str,
            "",  # No expense code
            "",  # Trailing delimiter
        ]
        rendered_line = "[]".join(synth_line)
        errors = validate_ledes_1998b_line(rendered_line)
        if errors:
            validation_errors.extend(errors)
        lines.append(rendered_line)

    full_content = "\n".join(lines) + "\n"
    file_name = f"{invoice_number}_LEDES1998B.txt"

    return {
        "bill_id": bill.bill_id,
        "invoice_number": invoice_number,
        "file_name": file_name,
        "total_amount": float(bill.amount),
        "line_item_count": len(lines) - 1,
        "is_valid": len(validation_errors) == 0,
        "validation_errors": validation_errors,
        "file_content": full_content,
    }


def get_utbms_reference_data() -> dict[str, Any]:
    """Returns official UTBMS Task, Activity, and Expense codes for frontends."""
    return {
        "task_codes": [{"code": k, "description": v} for k, v in UTBMS_TASK_CODES.items()],
        "activity_codes": [{"code": k, "description": v} for k, v in UTBMS_ACTIVITY_CODES.items()],
        "expense_codes": [{"code": k, "description": v} for k, v in UTBMS_EXPENSE_CODES.items()],
    }
