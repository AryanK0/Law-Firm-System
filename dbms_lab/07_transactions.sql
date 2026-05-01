USE lawfirm;

-- Educational transaction templates. Run manually when demonstrating.

START TRANSACTION;
SAVEPOINT before_demo_audit;
INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value)
VALUES (1, 'LAB_TRANSACTION', 'Cases', 1, 'Inserted during transaction lab');
ROLLBACK TO SAVEPOINT before_demo_audit;
COMMIT;

-- Production transaction procedures:
-- CALL sp_open_new_case_transaction(...);
-- CALL sp_approve_billing_transaction(bill_id, approver_id);
-- CALL sp_assign_employee_case_locked(case_id, employee_id, role, assigned_by);
-- CALL sp_restore_checkpoint(checkpoint_id);

SELECT txn_id, txn_type, table_name, action, status, created_at
FROM Transaction_Log
ORDER BY created_at DESC
LIMIT 20;
