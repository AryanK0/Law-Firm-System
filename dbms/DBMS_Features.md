# DBMS Lab Feature Map

This folder is a professor-facing syllabus map. The production app remains in `backend/` and `frontend/`.

| Syllabus topic | File | Project mapping |
| --- | --- | --- |
| PL/SQL basics | `01_plsql_basics.sql` | Variables, constants, SELECT INTO, type-style examples using Employee, Cases, Billing, Ticket |
| Control structures | `02_control_structures.sql` | IF, ELSEIF, CASE, LOOP, WHILE, query-driven loop sources |
| Procedures | `03_procedures.sql` | Calls app procedures for cases, tickets, checkpoints, delegation, reports |
| Functions | `04_functions.sql` | Billing totals, hours, permission checks, case access, document clearance |
| Cursors | `05_cursors.sql` | Explicit cursor with OPEN, FETCH, NOT FOUND handler, CLOSE, report inserts |
| Triggers | `06_triggers.sql` | Audit, billing validation, document versioning, case access grants |
| Transactions | `07_transactions.sql` | START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT |
| Concurrency | `08_concurrency.sql` | SELECT FOR UPDATE procedures and Lock_Log |
| Recovery | `09_recovery.sql` | Transaction_Log, System_Checkpoint, recovery procedures |
| Dashboard queries | `10_dashboard_queries.sql` | Readable tabular outputs for review |
| Access control | `backend/sql/access_control.sql` | Hierarchy_Level, Permission, Case_Access, clearance, delegation, access requests, violations |
