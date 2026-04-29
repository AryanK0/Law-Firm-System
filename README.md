# Law Firm Management System

Academic DBMS project built around a law-firm operations dataset using:

- `MySQL 8.x` as the database
- `Stored procedures`, `stored functions`, `cursor procedures`, `triggers`, `views`, and joined SQL reports
- `FastAPI` as the backend API layer
- `React + Vite + Tailwind` as the frontend interface

The project models legal matters, clients, employees, access control, hearings, billing, documents, support tickets, conflicts, and audit logs. The frontend is still usable, but the database layer is now the main focus of the system.

## Project Purpose

This project is designed to show a DBMS-oriented implementation of a legal-management system:

- manage cases and their teams
- track client relationships and interactions
- record documents and document versions
- control matter access and conflict checks
- manage billing approvals
- track support tickets and SLA risk
- maintain auditability through logs and triggers

## DBMS Features Implemented

### Core schema

The schema lives in [backend/sql/schema.sql](backend/sql/schema.sql) and contains:

- normalized master tables such as `Department`, `Role`, `Employee`, `Client`, `Court`, `Permission`
- transactional tables such as `Cases`, `Case_Team`, `Hearing`, `Document`, `Billing`, `Time_Log`, `Ticket`
- control and audit tables such as `Access_Control`, `Conflict_Check`, `Audit_Log`, `Ticket_Logs`, `IT_System_Log`
- foreign keys, check constraints, and performance-oriented indexes

### Stored procedures and functions

The stored-programming layer lives in [backend/sql/procedures.sql](backend/sql/procedures.sql).

#### Procedures used by the backend

- `create_case_full`
- `assign_employee_case`
- `approve_billing`
- `raise_ticket`
- `resolve_ticket_workflow`

#### Cursor procedures

- `generate_client_billing_report`
- `generate_ticket_sla_review`

These are included specifically so the project clearly demonstrates cursor usage in MySQL stored programming.

#### Stored functions

- `check_access`
- `get_employee_access_level`
- `get_case_billed_total`
- `get_case_total_hours`

### Triggers

The trigger layer lives in [backend/sql/triggers.sql](backend/sql/triggers.sql).

Implemented trigger workflows include:

- conflict blocking before case-team assignment
- automatic case status history logging
- employee update auditing
- billing approval validation
- SLA breach marking on ticket resolution
- automatic initial document version creation
- ticket update logging
- time-log approval and hours validation

### Views and joined reporting

The reporting/view layer lives in [backend/sql/views_reports.sql](backend/sql/views_reports.sql).

Important views include:

- `vw_employee_directory`
- `vw_role_access_matrix`
- `vw_case_overview`
- `vw_case_team_roster`
- `vw_hearing_calendar`
- `vw_document_register`
- `vw_billing_register`
- `vw_ticket_overview`
- `vw_client_portfolio`
- `vw_conflict_register`
- `vw_audit_trail`

### Tabular SQL output

The manual report script lives in [backend/sql/tabular_reports.sql](backend/sql/tabular_reports.sql).

It prints joined tabular output for:

- employees
- roles and permissions
- clients
- cases
- case teams
- hearings
- documents
- billing
- time logs
- tickets
- ticket logs
- access control
- conflicts
- audit logs
- IT logs

It also demonstrates the cursor procedures directly using:

```sql
CALL generate_client_billing_report(1);
CALL generate_ticket_sla_review(3);
```

## Repository Structure

```text
backend/
  app/
    main.py
    db.py
    config.py
    routes/
    services/
  sql/
    schema.sql
    triggers.sql
    procedures.sql
    views_reports.sql
    sample_data.sql
    tabular_reports.sql
    init_db.ps1
frontend/
  src/
uploads/
```

## Database Setup

### 1. Configure connection values

Copy `.env.example` to `.env` or `backend/.env` and set the MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lawfirm
DB_USER=root
DB_PASSWORD=your_password_here
```

### 2. Initialize the database

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ResetDatabase -IncludeSampleData
```

Useful variations:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -User root
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ServerHost localhost
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -MysqlPath "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ResetDatabase
```

When sample data is included, the script also creates placeholder files inside `/uploads` so seeded document rows have matching local file names.

### 3. Manual SQL execution order

If you want to run the SQL files manually, use this order:

```sql
SOURCE backend/sql/schema.sql;
SOURCE backend/sql/triggers.sql;
SOURCE backend/sql/procedures.sql;
SOURCE backend/sql/views_reports.sql;
SOURCE backend/sql/sample_data.sql;
```

To print the joined report output after initialization:

```sql
SOURCE backend/sql/tabular_reports.sql;
```

## Backend

Install backend dependencies:

```powershell
python -m pip install -r .\backend\requirements.txt
```

Run the API:

```powershell
uvicorn backend.app.main:app --reload
```

Main routes:

- `GET /`
- `GET /health`
- `GET /overview`
- `GET /analytics`
- `GET /cases`
- `GET /cases/{case_id}`
- `GET /cases/{case_id}/team`
- `POST /cases/{case_id}/team`
- `GET /cases/{case_id}/documents`
- `GET /cases/{case_id}/status-history`
- `GET /cases/{case_id}/billing`
- `POST /billing/{bill_id}/approve`
- `GET /clients`
- `POST /clients`
- `GET /documents`
- `GET /tickets`
- `POST /tickets`
- `POST /tickets/{ticket_id}/resolve`
- `GET /employees`
- `GET /roles`
- `POST /upload-document/`

Open `http://127.0.0.1:8000/docs` for the interactive API docs.

## Frontend

Install dependencies from the repository root:

```powershell
npm install
```

Run the frontend:

```powershell
npm run dev
```

Build the frontend:

```powershell
npm run build
```

By default, the frontend calls `http://127.0.0.1:8000`. Override it with `VITE_API_BASE_URL` if needed.

## What Happens in the System

### Case creation

`POST /cases` calls the stored procedure `create_case_full`, which:

- inserts the case
- inserts the initial case status history row
- auto-assigns the lead partner and lead senior into `Case_Team`

### Case-team assignment

`POST /cases/{case_id}/team` calls `assign_employee_case`, which:

- inserts the team assignment
- records related access in `Access_Control`
- still passes through the conflict-check trigger

### Billing approval

`POST /billing/{bill_id}/approve` calls `approve_billing`, which:

- marks the bill as approved
- records the approver
- writes an audit entry
- is still validated by the approval trigger

### Ticket workflow

`POST /tickets` calls `raise_ticket`.

`POST /tickets/{ticket_id}/resolve` calls `resolve_ticket_workflow`.

This moves ticket business rules into MySQL so permissions, status change handling, and SLA-related logging are not only enforced in Python.

### Document workflow

When a new document row is inserted:

- the document is stored in `Document`
- the trigger automatically creates version `1` in `Document_Version`

## Suggested Viva / Demo Flow

1. Show the schema and explain the main entities.
2. Show `procedures.sql`, `triggers.sql`, and `views_reports.sql`.
3. Run `tabular_reports.sql` in MySQL.
4. Demonstrate `CALL generate_client_billing_report(1);`
5. Demonstrate `CALL generate_ticket_sla_review(3);`
6. Open the frontend and show that case, document, ticket, and overview screens still work.

## Notes

- This project satisfies the requirement to use procedures/functions, cursors, and triggers.
- It uses `MySQL` stored programming, not Oracle PL/SQL.
- If your faculty uses the phrase `PL-SQL` generically for database procedural logic, this project matches the intent well.
- If they specifically require Oracle `PL/SQL`, the database platform would need to change.
