-- DATABASE
CREATE DATABASE IF NOT EXISTS lawfirm;
USE lawfirm;

-- DEPARTMENT
CREATE TABLE Department (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE
);

-- ROLE
CREATE TABLE Role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  hierarchy_level INT NOT NULL
);

-- EMPLOYEE
CREATE TABLE Employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  role_id INT NOT NULL,
  department_id INT NOT NULL,
  supervisor_id INT NULL,
  employment_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  FOREIGN KEY (role_id) REFERENCES Role(role_id),
  FOREIGN KEY (department_id) REFERENCES Department(department_id),
  FOREIGN KEY (supervisor_id) REFERENCES Employee(employee_id)
);

-- ASSISTANT ASSIGNMENT
CREATE TABLE Assistant_Assignment (
  assistant_id INT,
  assigned_to INT,
  type VARCHAR(50),
  PRIMARY KEY (assistant_id, assigned_to),
  FOREIGN KEY (assistant_id) REFERENCES Employee(employee_id),
  FOREIGN KEY (assigned_to) REFERENCES Employee(employee_id)
);

-- CLIENT
CREATE TABLE Client (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  contact_info TEXT,
  organization VARCHAR(100)
);

-- CASE
CREATE TABLE Cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_code VARCHAR(50) UNIQUE,
  title VARCHAR(200),
  description TEXT,
  case_type VARCHAR(100),
  client_id INT,
  lead_partner_id INT,
  lead_senior_id INT,
  status VARCHAR(50),
  confidentiality_level VARCHAR(50),
  created_by INT,
  start_date DATE,
  end_date DATE,
  FOREIGN KEY (client_id) REFERENCES Client(client_id),
  FOREIGN KEY (lead_partner_id) REFERENCES Employee(employee_id),
  FOREIGN KEY (lead_senior_id) REFERENCES Employee(employee_id)
);

-- CASE TEAM
CREATE TABLE Case_Team (
  case_id INT,
  employee_id INT,
  role_in_case VARCHAR(50),
  assigned_by INT,
  PRIMARY KEY (case_id, employee_id),
  FOREIGN KEY (case_id) REFERENCES Cases(case_id),
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

-- COLLABORATION
CREATE TABLE Partner_Collaboration (
  collaboration_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  partner_id INT,
  role VARCHAR(50),
  FOREIGN KEY (case_id) REFERENCES Cases(case_id),
  FOREIGN KEY (partner_id) REFERENCES Employee(employee_id)
);

-- COURT
CREATE TABLE Court (
  court_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100),
  jurisdiction_type VARCHAR(50)
);

-- HEARING
CREATE TABLE Hearing (
  hearing_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  court_id INT,
  date DATE,
  notes TEXT,
  FOREIGN KEY (case_id) REFERENCES Cases(case_id),
  FOREIGN KEY (court_id) REFERENCES Court(court_id)
);

-- CASE STATUS HISTORY
CREATE TABLE Case_Status_History (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES Cases(case_id)
);

-- DOCUMENT
CREATE TABLE Document (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  uploaded_by INT,
  confidentiality_level VARCHAR(50),
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES Cases(case_id)
);

-- DOCUMENT VERSION
CREATE TABLE Document_Version (
  version_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT,
  version_number INT,
  modified_by INT,
  modified_at DATETIME,
  change_notes TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(document_id)
);

-- BILLING
CREATE TABLE Billing (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  generated_by INT,
  approved_by INT,
  amount DECIMAL(10,2),
  status VARCHAR(50),
  FOREIGN KEY (case_id) REFERENCES Cases(case_id)
);

-- TIME LOG
CREATE TABLE Time_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  case_id INT,
  hours DECIMAL(5,2),
  work_description TEXT,
  approved_by INT,
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id),
  FOREIGN KEY (case_id) REFERENCES Cases(case_id)
);

-- CLIENT INTERACTION
CREATE TABLE Client_Interaction (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT,
  employee_id INT,
  interaction_type VARCHAR(50),
  notes TEXT,
  datetime DATETIME,
  FOREIGN KEY (client_id) REFERENCES Client(client_id)
);

-- TICKET
CREATE TABLE Ticket (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  raised_by INT,
  description TEXT,
  priority VARCHAR(50),
  status VARCHAR(50),
  assigned_to INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolution_deadline DATETIME,
  breach_flag BOOLEAN,
  FOREIGN KEY (raised_by) REFERENCES Employee(employee_id)
);

-- TICKET LOGS
CREATE TABLE Ticket_Logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT,
  updated_by INT,
  update_note TEXT,
  timestamp DATETIME,
  FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id)
);

-- IT LOG
CREATE TABLE IT_System_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  action_type VARCHAR(100),
  affected_table VARCHAR(100),
  timestamp DATETIME,
  ip_address VARCHAR(50)
);

-- PERMISSION
CREATE TABLE Permission (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  permission_name VARCHAR(100)
);

-- ROLE PERMISSION
CREATE TABLE Role_Permission (
  role_id INT,
  permission_id INT,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES Role(role_id),
  FOREIGN KEY (permission_id) REFERENCES Permission(permission_id)
);

-- ACCESS CONTROL
CREATE TABLE Access_Control (
  access_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  resource_type VARCHAR(50),
  resource_id INT,
  access_type VARCHAR(50)
);

-- CONFLICT CHECK
CREATE TABLE Conflict_Check (
  conflict_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  client_id INT,
  restriction_reason TEXT,
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
);

-- AUDIT LOG
CREATE TABLE Audit_Log (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50),
  table_name VARCHAR(100),
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  timestamp DATETIME
);
