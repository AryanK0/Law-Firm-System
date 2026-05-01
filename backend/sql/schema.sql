CREATE DATABASE IF NOT EXISTS lawfirm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lawfirm;

CREATE TABLE Department (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  hierarchy_level INT NOT NULL,
  CONSTRAINT chk_role_hierarchy_level CHECK (hierarchy_level BETWEEN 1 AND 10)
);

CREATE TABLE Employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  role_id INT NOT NULL,
  department_id INT NOT NULL,
  supervisor_id INT NULL,
  employment_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_employee_status CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES Role(role_id),
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES Department(department_id),
  CONSTRAINT fk_employee_supervisor FOREIGN KEY (supervisor_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Client (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  contact_info TEXT,
  organization VARCHAR(100)
);

CREATE TABLE Cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_code VARCHAR(50) UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  case_type VARCHAR(100),
  client_id INT NOT NULL,
  lead_partner_id INT,
  lead_senior_id INT,
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Internal',
  created_by INT,
  start_date DATE,
  end_date DATE,
  CONSTRAINT chk_case_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT fk_case_client FOREIGN KEY (client_id) REFERENCES Client(client_id),
  CONSTRAINT fk_case_lead_partner FOREIGN KEY (lead_partner_id) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_case_lead_senior FOREIGN KEY (lead_senior_id) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_case_creator FOREIGN KEY (created_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Case_Team (
  case_id INT NOT NULL,
  employee_id INT NOT NULL,
  role_in_case VARCHAR(50) NOT NULL,
  assigned_by INT,
  PRIMARY KEY (case_id, employee_id),
  CONSTRAINT fk_case_team_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_team_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_team_assigner FOREIGN KEY (assigned_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Partner_Collaboration (
  collaboration_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  partner_id INT,
  role VARCHAR(50) NOT NULL,
  CONSTRAINT fk_collaboration_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_collaboration_partner FOREIGN KEY (partner_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Court (
  court_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  jurisdiction_type VARCHAR(50)
);

CREATE TABLE Hearing (
  hearing_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  court_id INT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  CONSTRAINT fk_hearing_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_hearing_court FOREIGN KEY (court_id) REFERENCES Court(court_id)
);

CREATE TABLE Case_Status_History (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_history_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_history_user FOREIGN KEY (changed_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Document (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  uploaded_by INT,
  confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Internal',
  file_path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_document_uploader FOREIGN KEY (uploaded_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Document_Version (
  version_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  version_number INT NOT NULL,
  modified_by INT,
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  CONSTRAINT chk_document_version_number CHECK (version_number >= 1),
  CONSTRAINT fk_document_version_document FOREIGN KEY (document_id) REFERENCES Document(document_id) ON DELETE CASCADE,
  CONSTRAINT fk_document_version_user FOREIGN KEY (modified_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Billing (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  generated_by INT,
  approved_by INT,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  CONSTRAINT chk_billing_amount CHECK (amount >= 0),
  CONSTRAINT fk_billing_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_billing_generator FOREIGN KEY (generated_by) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_billing_approver FOREIGN KEY (approved_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Time_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  case_id INT NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  work_description TEXT,
  approved_by INT,
  CONSTRAINT chk_time_log_hours CHECK (hours > 0 AND hours <= 24),
  CONSTRAINT fk_time_log_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_time_log_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_time_log_approver FOREIGN KEY (approved_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Client_Interaction (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  employee_id INT,
  interaction_type VARCHAR(50) NOT NULL,
  notes TEXT,
  datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_interaction_client FOREIGN KEY (client_id) REFERENCES Client(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_client_interaction_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Ticket (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  raised_by INT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  assigned_to INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolution_deadline DATETIME,
  breach_flag BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_ticket_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT chk_ticket_resolution CHECK (resolved_at IS NULL OR resolved_at >= created_at),
  CONSTRAINT fk_ticket_raiser FOREIGN KEY (raised_by) REFERENCES Employee(employee_id),
  CONSTRAINT fk_ticket_assignee FOREIGN KEY (assigned_to) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Ticket_Logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  updated_by INT,
  update_note TEXT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_log_ticket FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_log_user FOREIGN KEY (updated_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IT_System_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  action_type VARCHAR(100) NOT NULL,
  affected_table VARCHAR(100) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  CONSTRAINT fk_it_log_user FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Permission (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE Role_Permission (
  hierarchy_id INT NOT NULL,
  permission_id INT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (hierarchy_id, permission_id),
  CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES Permission(permission_id) ON DELETE CASCADE
);

CREATE TABLE Access_Control (
  access_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT NOT NULL,
  access_type VARCHAR(50) NOT NULL,
  CONSTRAINT fk_access_control_user FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

CREATE TABLE Conflict_Check (
  conflict_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  client_id INT NOT NULL,
  restriction_reason TEXT NOT NULL,
  CONSTRAINT fk_conflict_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_conflict_client FOREIGN KEY (client_id) REFERENCES Client(client_id) ON DELETE CASCADE
);

CREATE TABLE Audit_Log (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE INDEX idx_employee_role_department ON Employee(role_id, department_id);
CREATE INDEX idx_employee_status ON Employee(status);
CREATE INDEX idx_case_client_status ON Cases(client_id, status);
CREATE INDEX idx_case_leads ON Cases(lead_partner_id, lead_senior_id);
CREATE INDEX idx_case_team_employee_role ON Case_Team(employee_id, role_in_case);
CREATE INDEX idx_hearing_case_date ON Hearing(case_id, date);
CREATE INDEX idx_document_case_created ON Document(case_id, created_at);
CREATE INDEX idx_document_version_document_number ON Document_Version(document_id, version_number);
CREATE INDEX idx_billing_case_status ON Billing(case_id, status);
CREATE INDEX idx_time_log_case_employee ON Time_Log(case_id, employee_id);
CREATE INDEX idx_client_interaction_client_datetime ON Client_Interaction(client_id, datetime);
CREATE INDEX idx_ticket_status_priority_deadline ON Ticket(status, priority, resolution_deadline);
CREATE INDEX idx_ticket_logs_ticket_time ON Ticket_Logs(ticket_id, timestamp);
CREATE INDEX idx_access_control_lookup ON Access_Control(employee_id, resource_type, resource_id);
CREATE INDEX idx_conflict_lookup ON Conflict_Check(employee_id, client_id);
CREATE INDEX idx_audit_log_lookup ON Audit_Log(table_name, record_id, timestamp);
