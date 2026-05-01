USE lawfirm;

-- Recovery uses Transaction_Log old_value/new_value JSON plus checkpoints.

SELECT txn_id, txn_type, table_name, record_id, action, status, error_message, created_at
FROM Transaction_Log
ORDER BY created_at DESC;

SELECT checkpoint_id, checkpoint_name, notes, created_at
FROM System_Checkpoint
ORDER BY created_at DESC;

-- Demo calls:
-- CALL sp_create_checkpoint('Lab checkpoint', 'Before recovery lab');
-- CALL sp_recover_transaction(1);
-- CALL sp_restore_checkpoint(1);
