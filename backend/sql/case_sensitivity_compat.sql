USE lawfirm;

-- Compatibility layer for case-sensitive environments (Linux / GitHub Actions default lower_case_table_names=0)
-- Bridges SQLAlchemy lowercase ORM models with PascalCase legacy tables without breaking any existing queries.

DELIMITER $$

DROP PROCEDURE IF EXISTS create_lowercase_compat_views $$
CREATE PROCEDURE create_lowercase_compat_views()
BEGIN
  DECLARE v_lower_case INT DEFAULT 0;
  SELECT @@lower_case_table_names INTO v_lower_case;
  
  IF v_lower_case = 0 THEN
    CREATE OR REPLACE VIEW department AS SELECT * FROM Department;
    CREATE OR REPLACE VIEW role AS SELECT * FROM Role;
    CREATE OR REPLACE VIEW employee AS SELECT * FROM Employee;
    CREATE OR REPLACE VIEW hierarchy_level AS SELECT * FROM Hierarchy_Level;
    CREATE OR REPLACE VIEW security_clearance AS SELECT * FROM Security_Clearance;
    CREATE OR REPLACE VIEW client AS SELECT * FROM Client;
    CREATE OR REPLACE VIEW cases AS SELECT * FROM Cases;
    CREATE OR REPLACE VIEW case_team AS SELECT * FROM Case_Team;
    CREATE OR REPLACE VIEW billing AS SELECT * FROM Billing;
    CREATE OR REPLACE VIEW document AS SELECT * FROM Document;
    CREATE OR REPLACE VIEW document_version AS SELECT * FROM Document_Version;
    CREATE OR REPLACE VIEW case_status_history AS SELECT * FROM Case_Status_History;
    CREATE OR REPLACE VIEW case_access AS SELECT * FROM Case_Access;
    CREATE OR REPLACE VIEW ticket AS SELECT * FROM Ticket;
    CREATE OR REPLACE VIEW time_log AS SELECT * FROM Time_Log;
    CREATE OR REPLACE VIEW trust_account AS SELECT * FROM Trust_Account;
    CREATE OR REPLACE VIEW trust_transaction AS SELECT * FROM Trust_Transaction;
    CREATE OR REPLACE VIEW three_way_reconciliation AS SELECT * FROM Three_Way_Reconciliation;
    CREATE OR REPLACE VIEW case_adverse_party AS SELECT * FROM Case_Adverse_Party;
  END IF;
END $$

DELIMITER ;

CALL create_lowercase_compat_views();
DROP PROCEDURE IF EXISTS create_lowercase_compat_views;
