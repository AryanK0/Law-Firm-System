USE lawfirm;

-- Compatibility views for Linux case-sensitive MySQL (lower_case_table_names=0)
-- Aliases PascalCase tables created in schema.sql & access_control.sql to lowercase for SQLAlchemy ORM models.

CREATE OR REPLACE VIEW department AS SELECT * FROM Department;
CREATE OR REPLACE VIEW role AS SELECT * FROM Role;
CREATE OR REPLACE VIEW employee AS SELECT * FROM Employee;
CREATE OR REPLACE VIEW client AS SELECT * FROM Client;
CREATE OR REPLACE VIEW cases AS SELECT * FROM Cases;
CREATE OR REPLACE VIEW case_team AS SELECT * FROM Case_Team;
CREATE OR REPLACE VIEW document AS SELECT * FROM Document;
CREATE OR REPLACE VIEW billing AS SELECT * FROM Billing;
CREATE OR REPLACE VIEW time_log AS SELECT * FROM Time_Log;
CREATE OR REPLACE VIEW ticket AS SELECT * FROM Ticket;
CREATE OR REPLACE VIEW document_version AS SELECT * FROM Document_Version;
CREATE OR REPLACE VIEW case_status_history AS SELECT * FROM Case_Status_History;
CREATE OR REPLACE VIEW hierarchy_level AS SELECT * FROM Hierarchy_Level;
CREATE OR REPLACE VIEW security_clearance AS SELECT * FROM Security_Clearance;
CREATE OR REPLACE VIEW case_access AS SELECT * FROM Case_Access;
