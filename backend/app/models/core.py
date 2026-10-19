from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base


class Department(Base):
    __tablename__ = "department"

    department_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Role(Base):
    __tablename__ = "role"

    role_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hierarchy_level: Mapped[int] = mapped_column(Integer, nullable=False)

    employees: Mapped[list["Employee"]] = relationship(back_populates="role")


class Employee(Base):
    __tablename__ = "employee"

    employee_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    role_id: Mapped[int] = mapped_column(ForeignKey("role.role_id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("department.department_id"), nullable=False)
    supervisor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    employment_type: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="Active", nullable=False)
    hierarchy_id: Mapped[Optional[int]] = mapped_column(ForeignKey("hierarchy_level.hierarchy_id"))
    clearance_id: Mapped[Optional[int]] = mapped_column(ForeignKey("security_clearance.clearance_id"))

    department: Mapped["Department"] = relationship(back_populates="employees")
    role: Mapped["Role"] = relationship(back_populates="employees")


class HierarchyLevel(Base):
    __tablename__ = "hierarchy_level"

    hierarchy_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    rank_no: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    can_view_lower: Mapped[bool] = mapped_column(Boolean, default=False)
    can_modify_lower: Mapped[bool] = mapped_column(Boolean, default=False)
    can_assign_case: Mapped[bool] = mapped_column(Boolean, default=False)
    can_approve_billing: Mapped[bool] = mapped_column(Boolean, default=False)
    can_override_access: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_financials: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_confidential_docs: Mapped[bool] = mapped_column(Boolean, default=False)
    can_create_checkpoint: Mapped[bool] = mapped_column(Boolean, default=False)
    can_run_recovery: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_lock_log: Mapped[bool] = mapped_column(Boolean, default=False)


class SecurityClearance(Base):
    __tablename__ = "security_clearance"

    clearance_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    level_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    numeric_rank: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)


class Client(Base):
    __tablename__ = "client"

    client_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    contact_info: Mapped[Optional[str]] = mapped_column(Text)
    organization: Mapped[Optional[str]] = mapped_column(String(100))

    cases: Mapped[list["Case"]] = relationship(back_populates="client")


class Case(Base):
    __tablename__ = "cases"

    case_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    case_type: Mapped[Optional[str]] = mapped_column(String(100))
    client_id: Mapped[int] = mapped_column(ForeignKey("client.client_id"), nullable=False)
    lead_partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    lead_senior_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    status: Mapped[str] = mapped_column(String(50), default="Open", nullable=False)
    confidentiality_level: Mapped[str] = mapped_column(String(50), default="Internal", nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    legal_hold_reason: Mapped[Optional[str]] = mapped_column(Text)
    legal_hold_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    legal_hold_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    opposing_party: Mapped[Optional[str]] = mapped_column(String(200))
    opposing_counsel: Mapped[Optional[str]] = mapped_column(String(200))

    __mapper_args__ = {"version_id_col": version}

    client: Mapped["Client"] = relationship(back_populates="cases")
    team: Mapped[list["CaseTeam"]] = relationship(back_populates="case")
    documents: Mapped[list["Document"]] = relationship(back_populates="case")
    billings: Mapped[list["Billing"]] = relationship(back_populates="case")
    status_history: Mapped[list["CaseStatusHistory"]] = relationship(back_populates="case")
    adverse_parties: Mapped[list["CaseAdverseParty"]] = relationship(back_populates="case")
    time_logs: Mapped[list["TimeLog"]] = relationship(back_populates="case")


class CaseTeam(Base):
    __tablename__ = "case_team"

    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), primary_key=True)
    role_in_case: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))

    case: Mapped["Case"] = relationship(back_populates="team")


class Billing(Base):
    __tablename__ = "billing"

    bill_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    generated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __mapper_args__ = {"version_id_col": version}

    case: Mapped["Case"] = relationship(back_populates="billings")


class Document(Base):
    __tablename__ = "document"

    document_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    uploaded_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    confidentiality_level: Mapped[str] = mapped_column(String(50), default="Internal", nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    clearance_id: Mapped[Optional[int]] = mapped_column(ForeignKey("security_clearance.clearance_id"))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(String(500))
    s3_bucket: Mapped[Optional[str]] = mapped_column(String(100))
    sha256_checksum: Mapped[Optional[str]] = mapped_column(String(64))
    encryption_status: Mapped[str] = mapped_column(String(50), default="AES-256", nullable=False)
    ocr_status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)

    __mapper_args__ = {"version_id_col": version}

    case: Mapped["Case"] = relationship(back_populates="documents")
    versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="document", cascade="all, delete-orphan", passive_deletes=True)


class DocumentVersion(Base):
    __tablename__ = "document_version"

    version_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.document_id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    modified_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    modified_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    change_notes: Mapped[Optional[str]] = mapped_column(Text)

    document: Mapped["Document"] = relationship(back_populates="versions")


class CaseStatusHistory(Base):
    __tablename__ = "case_status_history"

    history_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    old_status: Mapped[Optional[str]] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    case: Mapped["Case"] = relationship(back_populates="status_history")


class CaseAccess(Base):
    __tablename__ = "case_access"

    case_access_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), nullable=False)
    case_role: Mapped[Optional[str]] = mapped_column(String(50))
    can_view: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_upload_docs: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_approve_docs: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_close_case: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_assign_members: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    granted_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class Ticket(Base):
    __tablename__ = "ticket"

    ticket_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raised_by: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="Medium", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Open", nullable=False)
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    resolution_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime)
    breach_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TimeLog(Base):
    __tablename__ = "time_log"

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), nullable=False)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    work_description: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employee.employee_id"))
    log_date: Mapped[Optional[date]] = mapped_column(Date)
    rate_per_hour: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=Decimal("350.00"))
    task_code: Mapped[Optional[str]] = mapped_column(String(20))
    activity_code: Mapped[Optional[str]] = mapped_column(String(20))
    expense_code: Mapped[Optional[str]] = mapped_column(String(20))
    line_item_type: Mapped[str] = mapped_column(String(10), default="F", nullable=False)
    adjustment_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    case: Mapped["Case"] = relationship(back_populates="time_logs")


class TrustAccount(Base):
    __tablename__ = "trust_account"

    account_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'IOLTA_TRUST', 'OPERATING'
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __mapper_args__ = {"version_id_col": version}

    transactions: Mapped[list["TrustTransaction"]] = relationship(back_populates="account")


class TrustTransaction(Base):
    __tablename__ = "trust_transaction"

    transaction_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("trust_account.account_id"), nullable=False)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("client.client_id"))
    case_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cases.case_id"))
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'DEPOSIT', 'DISBURSEMENT', 'EARNED_FEE_TRANSFER'
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    running_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    client_running_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100))
    payee_or_payor: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    cleared: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    account: Mapped["TrustAccount"] = relationship(back_populates="transactions")


class ThreeWayReconciliation(Base):
    __tablename__ = "three_way_reconciliation"

    reconciliation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("trust_account.account_id"), nullable=False)
    statement_date: Mapped[date] = mapped_column(Date, nullable=False)
    bank_statement_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    general_ledger_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    client_ledger_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    variance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # 'BALANCED', 'DISCREPANCY'
    reconciled_by: Mapped[int] = mapped_column(ForeignKey("employee.employee_id"), nullable=False)
    reconciled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)


class CaseAdverseParty(Base):
    __tablename__ = "case_adverse_party"

    party_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.case_id"), nullable=False)
    party_name: Mapped[str] = mapped_column(String(200), nullable=False)
    party_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'OPPOSING_PARTY', 'CO_DEFENDANT', 'KEY_WITNESS', 'AFFILIATE'
    corporate_affiliate: Mapped[Optional[str]] = mapped_column(String(200))
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    case: Mapped["Case"] = relationship(back_populates="adverse_parties")
