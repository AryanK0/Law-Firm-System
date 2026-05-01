USE lawfirm;

-- Concurrency examples use SELECT ... FOR UPDATE inside procedures.
-- Review implementation in sp_lock_case_record, sp_assign_employee_case_locked,
-- sp_approve_billing_transaction, and sp_update_document_version_transaction.

SELECT lock_id, table_name, record_id, locked_by, lock_reason, locked_at, released_at, status
FROM Lock_Log
ORDER BY locked_at DESC;

-- Demo call:
-- CALL sp_lock_case_record(1, 2);
-- CALL sp_release_case_lock(1, 2);
