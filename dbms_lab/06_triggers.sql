USE lawfirm;

-- Trigger map:
-- trg_case_status_update: case update audit/status history.
-- trg_case_team_access_insert: auto Case_Access grant on team insert.
-- trg_document_clearance_default: maps document confidentiality to clearance.
-- trg_billing_approval_validate: validates billing approval.
-- trg_document_version_initial: creates initial document version.
-- trg_ticket_breach_update: marks SLA breach.
-- trg_delegated_access_expire_insert/update: expires stale delegations.

SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME;
