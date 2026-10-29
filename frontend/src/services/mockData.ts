import type {
  AccessDashboardResponse,
  AdversePartyRecord,
  AnalyticsResponse,
  AuthUserResponse,
  CaseBillingResponse,
  CaseDetailRecord,
  CaseDocumentsResponse,
  CaseRecord,
  CaseStatusHistoryResponse,
  CaseTeamResponse,
  ClientRecord,
  ClientTrustSummaryResponse,
  ConflictCheckResponse,
  DbmsCaseReportRecord,
  DbmsCheckpointRecord,
  DbmsEmployeeReportRecord,
  DbmsLockRecord,
  DbmsTicketReportRecord,
  DbmsTransactionsResponse,
  DocumentRecord,
  EmployeeRecord,
  LedesInvoiceResponse,
  OverviewResponse,
  SystemTelemetryResponse,
  ThreeWayReconciliationResponse,
  TicketRecord,
  TokenResponse,
  TrustAccountRecord,
  UtbmsReferenceResponse,
} from "./api";

export const mockOverview: OverviewResponse = {
  firm: {
    name: "PSL Law",
    tagline: "Premium operations workspace for matters, access, hearings, and support.",
  },
  summary: {
    active_people: 20,
    open_matters: 8,
    upcoming_hearings: 4,
    open_tickets: 3,
    active_clients: 14,
    tracked_revenue: 1248500,
    pending_bills: 2,
    sla_risk: 0,
  },
  featured_people: [
    {
      employee_id: 1,
      name: "Jessica Pearson",
      role_name: "Managing Partner",
      department_name: "Executive",
      status: "Active",
      employment_type: "Equity",
      supervisor_name: null,
      access_level: "Executive",
    },
    {
      employee_id: 2,
      name: "Harvey Specter",
      role_name: "Partner",
      department_name: "Litigation",
      status: "Active",
      employment_type: "Equity",
      supervisor_name: "Jessica Pearson",
      access_level: "Leadership",
    },
    {
      employee_id: 3,
      name: "Louis Litt",
      role_name: "Partner",
      department_name: "Corporate",
      status: "Active",
      employment_type: "Equity",
      supervisor_name: "Jessica Pearson",
      access_level: "Leadership",
    },
    {
      employee_id: 4,
      name: "Donna Paulsen",
      role_name: "Finance Admin",
      department_name: "Operations",
      status: "Active",
      employment_type: "Full-Time",
      supervisor_name: "Jessica Pearson",
      access_level: "Executive",
    },
  ],
  role_access: [
    {
      role_id: 1,
      role_name: "Managing Partner",
      hierarchy_level: 1,
      access_level: "Executive",
      permissions: "All Matters, IOLTA Fiduciary, Ethical Walls, Billing Sign-off",
    },
    {
      role_id: 2,
      role_name: "Partner",
      hierarchy_level: 2,
      access_level: "Leadership",
      permissions: "Case Management, Trust Disbursements, Team Assignment",
    },
    {
      role_id: 3,
      role_name: "Senior Associate",
      hierarchy_level: 3,
      access_level: "Senior Matter Access",
      permissions: "Document Drafting, Hearing Representation, Time Billing",
    },
    {
      role_id: 4,
      role_name: "Associate",
      hierarchy_level: 4,
      access_level: "Matter Access",
      permissions: "Discovery Review, Legal Research, Brief Drafting",
    },
  ],
  priority_matters: [
    {
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      case_type: "Antitrust",
      status: "Open",
      confidentiality_level: "Highly Confidential",
      client_name: "Liberty Rail Holdings",
      lead_partner_name: "Harvey Specter",
      lead_senior_name: "Katrina Bennett",
      start_date: "2026-01-10",
      end_date: "2026-05-22",
    },
    {
      case_id: 2,
      case_code: "MAT-2026-002",
      title: "Blue Ridge proxy defense",
      case_type: "Corporate Litigation",
      status: "Hearing Scheduled",
      confidentiality_level: "Confidential",
      client_name: "Blue Ridge Capital",
      lead_partner_name: "Louis Litt",
      lead_senior_name: "Katrina Bennett",
      start_date: "2026-01-28",
      end_date: "2026-04-28",
    },
    {
      case_id: 3,
      case_code: "MAT-2026-003",
      title: "Monarch Aviation labor arbitration",
      case_type: "Arbitration",
      status: "Open",
      confidentiality_level: "Confidential",
      client_name: "Monarch Aviation Group",
      lead_partner_name: "Alex Williams",
      lead_senior_name: "Brian Altman",
      start_date: "2026-02-03",
      end_date: "2026-06-10",
    },
    {
      case_id: 5,
      case_code: "MAT-2026-005",
      title: "Sterling acquisition diligence",
      case_type: "Mergers and Acquisitions",
      status: "Open",
      confidentiality_level: "Highly Confidential",
      client_name: "Sterling Biotech",
      lead_partner_name: "Harvey Specter",
      lead_senior_name: "Katrina Bennett",
      start_date: "2026-02-24",
      end_date: "2026-05-15",
    },
  ],
  upcoming_hearings: [
    {
      hearing_id: 1,
      date: "2026-04-14T09:30:00",
      notes: "Preliminary injunction argument regarding poison pill disclosure",
      case_id: 2,
      case_code: "MAT-2026-002",
      title: "Blue Ridge proxy defense",
      court_name: "Delaware Court of Chancery",
      location: "Wilmington, DE",
    },
    {
      hearing_id: 2,
      date: "2026-04-22T10:00:00",
      notes: "Initial pre-trial conference and discovery scheduling order",
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      court_name: "U.S. District Court, SDNY",
      location: "New York, NY",
    },
    {
      hearing_id: 3,
      date: "2026-05-02T14:00:00",
      notes: "Arbitration evidentiary hearing - Session 1",
      case_id: 3,
      case_code: "MAT-2026-003",
      title: "Monarch Aviation labor arbitration",
      court_name: "American Arbitration Association",
      location: "Chicago, IL",
    },
  ],
  recent_documents: [
    {
      document_id: 101,
      created_at: "2026-03-28T16:45:00",
      confidentiality_level: "Highly Confidential",
      file_path: "uploads/Liberty_Rail_Antitrust_Defense_Brief_v3.pdf",
      case_code: "MAT-2026-001",
      title: "Antitrust Pre-Trial Defense Brief",
      uploaded_by_name: "Katrina Bennett",
    },
    {
      document_id: 102,
      created_at: "2026-03-27T11:20:00",
      confidentiality_level: "Confidential",
      file_path: "uploads/Blue_Ridge_Delaware_Chancery_Injunction_Motion.pdf",
      case_code: "MAT-2026-002",
      title: "Emergency Motion for Injunction",
      uploaded_by_name: "Mike Ross",
    },
    {
      document_id: 103,
      created_at: "2026-03-25T14:10:00",
      confidentiality_level: "Highly Confidential",
      file_path: "uploads/Sterling_Biotech_Due_Diligence_Report_Final.pdf",
      case_code: "MAT-2026-005",
      title: "Due Diligence Audit & IP Assessment",
      uploaded_by_name: "Harvey Specter",
    },
  ],
  support_watch: [
    {
      ticket_id: 1,
      description: "Emergency matter file access grant for Delaware Chancery hearing",
      priority: "High",
      status: "In Progress",
      resolution_deadline: "2026-04-12T18:00:00",
      breach_flag: false,
      raised_by_name: "Mike Ross",
      assigned_to_name: "Benjamin",
    },
    {
      ticket_id: 2,
      description: "WORM S3 archive checksum validation for Q1 litigation audit",
      priority: "Medium",
      status: "Open",
      resolution_deadline: "2026-04-15T18:00:00",
      breach_flag: false,
      raised_by_name: "Donna Paulsen",
      assigned_to_name: "Benjamin",
    },
  ],
  department_coverage: [
    { name: "Litigation", headcount: 6 },
    { name: "Corporate", headcount: 5 },
    { name: "Client Advisory", headcount: 3 },
    { name: "Operations", headcount: 2 },
    { name: "Technology", headcount: 2 },
    { name: "Executive", headcount: 2 },
  ],
  client_portfolio: [
    {
      client_id: 1,
      client_name: "Liberty Rail Holdings",
      matter_count: 2,
      billed_total: 420000,
      last_contact: "2026-03-26",
    },
    {
      client_id: 2,
      client_name: "Blue Ridge Capital",
      matter_count: 3,
      billed_total: 385000,
      last_contact: "2026-03-28",
    },
    {
      client_id: 3,
      client_name: "Monarch Aviation Group",
      matter_count: 1,
      billed_total: 195000,
      last_contact: "2026-03-24",
    },
    {
      client_id: 5,
      client_name: "Sterling Biotech",
      matter_count: 2,
      billed_total: 248500,
      last_contact: "2026-03-27",
    },
  ],
  recent_interactions: [
    {
      interaction_id: 1,
      interaction_type: "Partner Conference",
      notes: "Reviewed antitrust exposure and FTC settlement parameters with General Counsel.",
      datetime: "2026-03-27T15:00:00",
      client_name: "Liberty Rail Holdings",
      employee_name: "Harvey Specter",
    },
    {
      interaction_id: 2,
      interaction_type: "Strategy Session",
      notes: "Delaware Chancery hearing preparation and activist shareholder proxy count.",
      datetime: "2026-03-26T11:30:00",
      client_name: "Blue Ridge Capital",
      employee_name: "Louis Litt",
    },
  ],
  billing_watch: [
    {
      bill_id: 201,
      amount: 125000,
      status: "Pending",
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      client_name: "Liberty Rail Holdings",
      generated_by_name: "Katrina Bennett",
      approved_by_name: null,
    },
    {
      bill_id: 202,
      amount: 88500,
      status: "Pending",
      case_code: "MAT-2026-002",
      title: "Blue Ridge proxy defense",
      client_name: "Blue Ridge Capital",
      generated_by_name: "Mike Ross",
      approved_by_name: null,
    },
    {
      bill_id: 203,
      amount: 215000,
      status: "Approved",
      case_code: "MAT-2026-005",
      title: "Sterling acquisition diligence",
      client_name: "Sterling Biotech",
      generated_by_name: "Harvey Specter",
      approved_by_name: "Jessica Pearson",
    },
  ],
};

export const mockAnalytics: AnalyticsResponse = {
  summary: {
    total_cases: 14,
    open_cases: 8,
    total_tickets: 10,
    breached_tickets: 0,
    documents: 24,
  },
  case_status: [
    { name: "Open", value: 8 },
    { name: "Hearing Scheduled", value: 3 },
    { name: "Drafting", value: 2 },
    { name: "Negotiation", value: 1 },
  ],
  billing: [
    { name: "Nov 2025", amount: 185000 },
    { name: "Dec 2025", amount: 210000 },
    { name: "Jan 2026", amount: 265000 },
    { name: "Feb 2026", amount: 295000 },
    { name: "Mar 2026", amount: 340000 },
  ],
  ticket_status: [
    { name: "Open", value: 2 },
    { name: "In Progress", value: 1 },
    { name: "Resolved", value: 7 },
  ],
  roles: [
    { name: "Managing Partner", value: 1 },
    { name: "Partner", value: 7 },
    { name: "Senior Associate", value: 3 },
    { name: "Associate", value: 3 },
    { name: "Paralegal", value: 3 },
    { name: "Finance Admin", value: 1 },
    { name: "IT Admin", value: 1 },
    { name: "Intern", value: 1 },
  ],
};

export const mockClients: ClientRecord[] = [
  {
    client_id: 1,
    name: "Evelyn Porter",
    organization: "Liberty Rail Holdings",
    contact_info: "evelyn.porter@libertyrail.com | +1-302-555-0181",
  },
  {
    client_id: 2,
    name: "Marcus Trent",
    organization: "Blue Ridge Capital",
    contact_info: "marcus.trent@blueridgecap.com | +1-646-555-0182",
  },
  {
    client_id: 3,
    name: "Ariana Cole",
    organization: "Monarch Aviation Group",
    contact_info: "ariana.cole@monarchaviation.com | +1-917-555-0183",
  },
  {
    client_id: 4,
    name: "Damien Cross",
    organization: "Vale Ridge Energy",
    contact_info: "damien.cross@valeridgeenergy.com | +1-713-555-0184",
  },
  {
    client_id: 5,
    name: "Nina Kapoor",
    organization: "Sterling Biotech",
    contact_info: "nina.kapoor@sterlingbiotech.com | +1-415-555-0185",
  },
  {
    client_id: 6,
    name: "Julian Moss",
    organization: "North Harbor Telecom",
    contact_info: "julian.moss@northharbortelecom.com | +1-206-555-0186",
  },
];

export const mockCases: CaseRecord[] = [
  {
    case_id: 1,
    case_code: "MAT-2026-001",
    title: "Liberty Rail antitrust readiness",
    description: "Antitrust defense against competitor claims following freight corridor expansion.",
    case_type: "Antitrust",
    client_id: 1,
    client_name: "Liberty Rail Holdings",
    lead_partner_id: 2,
    lead_partner_name: "Harvey Specter",
    lead_senior_id: 5,
    lead_senior_name: "Katrina Bennett",
    status: "Open",
    confidentiality_level: "Highly Confidential",
    created_by: 1,
    created_by_name: "Jessica Pearson",
    start_date: "2026-01-10",
    end_date: "2026-05-22",
    team_size: 4,
    document_count: 8,
    billed_total: 420000,
    total_hours: 185.5,
  },
  {
    case_id: 2,
    case_code: "MAT-2026-002",
    title: "Blue Ridge proxy defense",
    description: "Chancery litigation defending board poison pill mechanisms against hostile tender.",
    case_type: "Corporate Litigation",
    client_id: 2,
    client_name: "Blue Ridge Capital",
    lead_partner_id: 3,
    lead_partner_name: "Louis Litt",
    lead_senior_id: 5,
    lead_senior_name: "Katrina Bennett",
    status: "Hearing Scheduled",
    confidentiality_level: "Confidential",
    created_by: 3,
    created_by_name: "Louis Litt",
    start_date: "2026-01-28",
    end_date: "2026-04-28",
    team_size: 5,
    document_count: 6,
    billed_total: 385000,
    total_hours: 160.0,
  },
  {
    case_id: 3,
    case_code: "MAT-2026-003",
    title: "Monarch Aviation labor arbitration",
    description: "Union arbitration regarding collective bargaining and pilot retention incentives.",
    case_type: "Arbitration",
    client_id: 3,
    client_name: "Monarch Aviation Group",
    lead_partner_id: 10,
    lead_partner_name: "Alex Williams",
    lead_senior_id: 16,
    lead_senior_name: "Brian Altman",
    status: "Open",
    confidentiality_level: "Confidential",
    created_by: 10,
    created_by_name: "Alex Williams",
    start_date: "2026-02-03",
    end_date: "2026-06-10",
    team_size: 3,
    document_count: 4,
    billed_total: 195000,
    total_hours: 92.5,
  },
  {
    case_id: 5,
    case_code: "MAT-2026-005",
    title: "Sterling acquisition diligence",
    description: "Cross-border regulatory and IP diligence for pharmaceutical asset acquisition.",
    case_type: "Mergers and Acquisitions",
    client_id: 5,
    client_name: "Sterling Biotech",
    lead_partner_id: 2,
    lead_partner_name: "Harvey Specter",
    lead_senior_id: 5,
    lead_senior_name: "Katrina Bennett",
    status: "Open",
    confidentiality_level: "Highly Confidential",
    created_by: 2,
    created_by_name: "Harvey Specter",
    start_date: "2026-02-24",
    end_date: "2026-05-15",
    team_size: 4,
    document_count: 6,
    billed_total: 248500,
    total_hours: 114.0,
  },
];

export const mockEmployees: EmployeeRecord[] = [
  {
    employee_id: 1,
    name: "Jessica Pearson",
    email: "jessica.pearson@pearsonspecter.example",
    phone: "+1-212-555-0101",
    status: "Active",
    employment_type: "Equity",
    department_name: "Executive",
    role_name: "Managing Partner",
    hierarchy_level: 1,
    access_level: "Executive",
    supervisor_name: null,
  },
  {
    employee_id: 2,
    name: "Harvey Specter",
    email: "harvey.specter@pearsonspecter.example",
    phone: "+1-212-555-0102",
    status: "Active",
    employment_type: "Equity",
    department_name: "Litigation",
    role_name: "Partner",
    hierarchy_level: 2,
    access_level: "Leadership",
    supervisor_name: "Jessica Pearson",
  },
  {
    employee_id: 3,
    name: "Louis Litt",
    email: "louis.litt@pearsonspecter.example",
    phone: "+1-212-555-0103",
    status: "Active",
    employment_type: "Equity",
    department_name: "Corporate",
    role_name: "Partner",
    hierarchy_level: 2,
    access_level: "Leadership",
    supervisor_name: "Jessica Pearson",
  },
  {
    employee_id: 4,
    name: "Donna Paulsen",
    email: "donna.paulsen@pearsonspecter.example",
    phone: "+1-212-555-0104",
    status: "Active",
    employment_type: "Full-Time",
    department_name: "Operations",
    role_name: "Finance Admin",
    hierarchy_level: 4,
    access_level: "Executive",
    supervisor_name: "Jessica Pearson",
  },
  {
    employee_id: 5,
    name: "Katrina Bennett",
    email: "katrina.bennett@pearsonspecter.example",
    phone: "+1-212-555-0105",
    status: "Active",
    employment_type: "Full-Time",
    department_name: "Litigation",
    role_name: "Senior Associate",
    hierarchy_level: 3,
    access_level: "Senior Matter Access",
    supervisor_name: "Harvey Specter",
  },
  {
    employee_id: 6,
    name: "Mike Ross",
    email: "mike.ross@pearsonspecter.example",
    phone: "+1-212-555-0106",
    status: "Active",
    employment_type: "Full-Time",
    department_name: "Corporate",
    role_name: "Associate",
    hierarchy_level: 4,
    access_level: "Matter Access",
    supervisor_name: "Louis Litt",
  },
];

export const mockTickets: TicketRecord[] = [
  {
    ticket_id: 1,
    raised_by: 6,
    description: "Emergency matter file access grant for Delaware Chancery hearing",
    priority: "High",
    status: "In Progress",
    assigned_to: 8,
    created_at: "2026-03-25T10:00:00",
    resolution_deadline: "2026-04-12T18:00:00",
    resolved_at: null,
    breach_flag: false,
    raised_by_name: "Mike Ross",
    assigned_to_name: "Benjamin",
  },
  {
    ticket_id: 2,
    raised_by: 4,
    description: "WORM S3 archive checksum validation for Q1 litigation audit",
    priority: "Medium",
    status: "Open",
    assigned_to: 8,
    created_at: "2026-03-26T14:30:00",
    resolution_deadline: "2026-04-15T18:00:00",
    resolved_at: null,
    breach_flag: false,
    raised_by_name: "Donna Paulsen",
    assigned_to_name: "Benjamin",
  },
  {
    ticket_id: 3,
    raised_by: 5,
    description: "UTBMS invoice task code alignment for Liberty Rail electronic billing",
    priority: "Low",
    status: "Resolved",
    assigned_to: 4,
    created_at: "2026-03-15T09:15:00",
    resolution_deadline: "2026-03-20T18:00:00",
    resolved_at: "2026-03-18T16:00:00",
    breach_flag: false,
    raised_by_name: "Katrina Bennett",
    assigned_to_name: "Donna Paulsen",
  },
];

export const mockDocuments: DocumentRecord[] = [
  {
    document_id: 101,
    file_name: "Liberty_Rail_Antitrust_Defense_Brief_v3.pdf",
    confidentiality_level: "Highly Confidential",
    file_path: "uploads/Liberty_Rail_Antitrust_Defense_Brief_v3.pdf",
    file_url: "/uploads/Liberty_Rail_Antitrust_Defense_Brief_v3.pdf",
    latest_version: 3,
    version_count: 3,
    created_at: "2026-03-28T16:45:00",
    last_modified_at: "2026-03-28T16:45:00",
    case_id: 1,
    case_code: "MAT-2026-001",
    case_title: "Liberty Rail antitrust readiness",
    uploaded_by: 5,
    uploaded_by_name: "Katrina Bennett",
  },
  {
    document_id: 102,
    file_name: "Blue_Ridge_Delaware_Chancery_Injunction_Motion.pdf",
    confidentiality_level: "Confidential",
    file_path: "uploads/Blue_Ridge_Delaware_Chancery_Injunction_Motion.pdf",
    file_url: "/uploads/Blue_Ridge_Delaware_Chancery_Injunction_Motion.pdf",
    latest_version: 1,
    version_count: 1,
    created_at: "2026-03-27T11:20:00",
    last_modified_at: "2026-03-27T11:20:00",
    case_id: 2,
    case_code: "MAT-2026-002",
    case_title: "Blue Ridge proxy defense",
    uploaded_by: 6,
    uploaded_by_name: "Mike Ross",
  },
];

export const mockTrustAccounts: TrustAccountRecord[] = [
  {
    account_id: 1,
    account_number: "IOLTA-CHASE-0019482",
    account_name: "Primary Client Trust Account (IOLTA)",
    account_type: "IOLTA_TRUST",
    bank_name: "JPMorgan Chase Bank, N.A.",
    current_balance: 250000.0,
    version: 1,
    transaction_count: 14,
    created_at: "2026-01-01T00:00:00",
  },
  {
    account_id: 2,
    account_number: "OP-CHASE-0083921",
    account_name: "Firm General Operating Account",
    account_type: "OPERATING",
    bank_name: "JPMorgan Chase Bank, N.A.",
    current_balance: 750000.0,
    version: 1,
    transaction_count: 42,
    created_at: "2026-01-01T00:00:00",
  },
];

export const mockAccessDashboard: AccessDashboardResponse = {
  hierarchy: [
    {
      title: "Managing Partner",
      rank_no: 8,
      can_assign_case: true,
      can_approve_billing: true,
      can_override_access: true,
      can_run_recovery: true,
    },
    {
      title: "Partner",
      rank_no: 7,
      can_assign_case: true,
      can_approve_billing: true,
      can_override_access: true,
      can_run_recovery: false,
    },
    {
      title: "Senior Associate",
      rank_no: 6,
      can_assign_case: true,
      can_approve_billing: false,
      can_override_access: false,
      can_run_recovery: false,
    },
    {
      title: "Associate",
      rank_no: 5,
      can_assign_case: false,
      can_approve_billing: false,
      can_override_access: false,
      can_run_recovery: false,
    },
    {
      title: "Paralegal",
      rank_no: 4,
      can_assign_case: false,
      can_approve_billing: false,
      can_override_access: false,
      can_run_recovery: false,
    },
    {
      title: "IT Admin",
      rank_no: 3,
      can_assign_case: false,
      can_approve_billing: false,
      can_override_access: true,
      can_run_recovery: true,
    },
    {
      title: "Finance Admin",
      rank_no: 2,
      can_assign_case: false,
      can_approve_billing: true,
      can_override_access: false,
      can_run_recovery: false,
    },
    {
      title: "Intern",
      rank_no: 1,
      can_assign_case: false,
      can_approve_billing: false,
      can_override_access: false,
      can_run_recovery: false,
    },
  ],
  permissions: [
    { permission_id: 1, permission_name: "VIEW_CASE", description: "View matter profile and general docket" },
    { permission_id: 2, permission_name: "EDIT_CASE", description: "Modify matter status, description, and timeline" },
    { permission_id: 3, permission_name: "ASSIGN_CASE", description: "Staff and assign attorneys to matter teams" },
    { permission_id: 4, permission_name: "VIEW_DOCUMENT", description: "Read case exhibits and discovery documents" },
    { permission_id: 5, permission_name: "UPLOAD_DOCUMENT", description: "Deposit new exhibits into WORM storage" },
    { permission_id: 6, permission_name: "DELETE_DOCUMENT", description: "Expunge document versions from repository" },
    { permission_id: 7, permission_name: "VIEW_BILLING", description: "Inspect UTBMS LEDES invoices and time entries" },
    { permission_id: 8, permission_name: "APPROVE_BILLING", description: "Partner sign-off on client invoices and rates" },
    { permission_id: 9, permission_name: "OVERRIDE_ACCESS", description: "Firm-wide executive bypass for ethical review" },
    { permission_id: 10, permission_name: "ACCESS_AUDIT_LOG", description: "Inspect immutable tamper-evident security logs" },
    { permission_id: 11, permission_name: "CLOSE_CASE", description: "Execute formal matter closure and escrow sweep" },
  ],
  matrix: [
    { title: "Managing Partner", permission_name: "VIEW_CASE", allowed: true },
    { title: "Managing Partner", permission_name: "EDIT_CASE", allowed: true },
    { title: "Managing Partner", permission_name: "ASSIGN_CASE", allowed: true },
    { title: "Managing Partner", permission_name: "VIEW_DOCUMENT", allowed: true },
    { title: "Managing Partner", permission_name: "UPLOAD_DOCUMENT", allowed: true },
    { title: "Managing Partner", permission_name: "DELETE_DOCUMENT", allowed: true },
    { title: "Managing Partner", permission_name: "VIEW_BILLING", allowed: true },
    { title: "Managing Partner", permission_name: "APPROVE_BILLING", allowed: true },
    { title: "Managing Partner", permission_name: "OVERRIDE_ACCESS", allowed: true },
    { title: "Managing Partner", permission_name: "ACCESS_AUDIT_LOG", allowed: true },
    { title: "Managing Partner", permission_name: "CLOSE_CASE", allowed: true },
    { title: "Partner", permission_name: "VIEW_CASE", allowed: true },
    { title: "Partner", permission_name: "EDIT_CASE", allowed: true },
    { title: "Partner", permission_name: "ASSIGN_CASE", allowed: true },
    { title: "Partner", permission_name: "VIEW_DOCUMENT", allowed: true },
    { title: "Partner", permission_name: "UPLOAD_DOCUMENT", allowed: true },
    { title: "Partner", permission_name: "DELETE_DOCUMENT", allowed: false },
    { title: "Partner", permission_name: "VIEW_BILLING", allowed: true },
    { title: "Partner", permission_name: "APPROVE_BILLING", allowed: true },
    { title: "Partner", permission_name: "OVERRIDE_ACCESS", allowed: false },
    { title: "Partner", permission_name: "ACCESS_AUDIT_LOG", allowed: true },
    { title: "Partner", permission_name: "CLOSE_CASE", allowed: true },
    { title: "Senior Associate", permission_name: "VIEW_CASE", allowed: true },
    { title: "Senior Associate", permission_name: "EDIT_CASE", allowed: true },
    { title: "Senior Associate", permission_name: "ASSIGN_CASE", allowed: true },
    { title: "Senior Associate", permission_name: "VIEW_DOCUMENT", allowed: true },
    { title: "Senior Associate", permission_name: "UPLOAD_DOCUMENT", allowed: true },
    { title: "Senior Associate", permission_name: "VIEW_BILLING", allowed: true },
    { title: "Senior Associate", permission_name: "APPROVE_BILLING", allowed: false },
    { title: "Senior Associate", permission_name: "OVERRIDE_ACCESS", allowed: false },
    { title: "Senior Associate", permission_name: "CLOSE_CASE", allowed: false },
    { title: "Associate", permission_name: "VIEW_CASE", allowed: true },
    { title: "Associate", permission_name: "EDIT_CASE", allowed: true },
    { title: "Associate", permission_name: "ASSIGN_CASE", allowed: false },
    { title: "Associate", permission_name: "VIEW_DOCUMENT", allowed: true },
    { title: "Associate", permission_name: "UPLOAD_DOCUMENT", allowed: true },
    { title: "Associate", permission_name: "VIEW_BILLING", allowed: false },
    { title: "Associate", permission_name: "APPROVE_BILLING", allowed: false },
    { title: "Associate", permission_name: "OVERRIDE_ACCESS", allowed: false },
    { title: "Paralegal", permission_name: "VIEW_CASE", allowed: true },
    { title: "Paralegal", permission_name: "EDIT_CASE", allowed: false },
    { title: "Paralegal", permission_name: "ASSIGN_CASE", allowed: false },
    { title: "Paralegal", permission_name: "VIEW_DOCUMENT", allowed: true },
    { title: "Paralegal", permission_name: "UPLOAD_DOCUMENT", allowed: true },
    { title: "Paralegal", permission_name: "VIEW_BILLING", allowed: false },
    { title: "Paralegal", permission_name: "APPROVE_BILLING", allowed: false },
    { title: "Paralegal", permission_name: "OVERRIDE_ACCESS", allowed: false },
    { title: "IT Admin", permission_name: "VIEW_CASE", allowed: false },
    { title: "IT Admin", permission_name: "VIEW_LOCKS", allowed: true },
    { title: "IT Admin", permission_name: "CREATE_CHECKPOINT", allowed: true },
    { title: "IT Admin", permission_name: "RUN_RECOVERY", allowed: true },
    { title: "IT Admin", permission_name: "ACCESS_AUDIT_LOG", allowed: true },
    { title: "IT Admin", permission_name: "OVERRIDE_ACCESS", allowed: true },
  ],
  case_access: [
    {
      case_access_id: 1,
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      employee_id: 2,
      employee_name: "Harvey Specter",
      case_role: "Lead Partner",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 2,
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      employee_id: 5,
      employee_name: "Katrina Bennett",
      case_role: "Lead Senior Counsel",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 3,
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      employee_id: 6,
      employee_name: "Mike Ross",
      case_role: "Staff Associate",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: false,
    },
    {
      case_access_id: 4,
      case_id: 1,
      case_code: "MAT-2026-001",
      title: "Liberty Rail antitrust readiness",
      employee_id: 7,
      employee_name: "Rachel Zane",
      case_role: "Paralegal Support",
      can_view: true,
      can_edit: false,
      can_upload_docs: true,
      can_assign_members: false,
    },
    {
      case_access_id: 5,
      case_id: 2,
      case_code: "MAT-2026-002",
      title: "Blue Ridge proxy defense",
      employee_id: 2,
      employee_name: "Harvey Specter",
      case_role: "Lead Partner",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 6,
      case_id: 2,
      case_code: "MAT-2026-002",
      title: "Blue Ridge proxy defense",
      employee_id: 6,
      employee_name: "Mike Ross",
      case_role: "Staff Associate",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: false,
    },
    {
      case_access_id: 7,
      case_id: 3,
      case_code: "MAT-2026-003",
      title: "Monarch Aviation labor arbitration",
      employee_id: 5,
      employee_name: "Katrina Bennett",
      case_role: "Lead Senior Counsel",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 8,
      case_id: 4,
      case_code: "MAT-2026-004",
      title: "Apex Energy cross-border acquisition",
      employee_id: 2,
      employee_name: "Harvey Specter",
      case_role: "Lead Partner",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 9,
      case_id: 5,
      case_code: "MAT-2026-005",
      title: "Sterling Biotech clinical trial IP defense",
      employee_id: 2,
      employee_name: "Harvey Specter",
      case_role: "Lead Partner",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 10,
      case_id: 5,
      case_code: "MAT-2026-005",
      title: "Sterling Biotech clinical trial IP defense",
      employee_id: 5,
      employee_name: "Katrina Bennett",
      case_role: "Lead Senior Counsel",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
    {
      case_access_id: 11,
      case_id: 6,
      case_code: "MAT-2026-006",
      title: "Falcon Logistics fleet regulatory compliance",
      employee_id: 5,
      employee_name: "Katrina Bennett",
      case_role: "Lead Senior Counsel",
      can_view: true,
      can_edit: true,
      can_upload_docs: true,
      can_assign_members: true,
    },
  ],
  clearances: [
    { clearance_id: 5, name: "Level 5 (Top Secret)", rank: 5, clearance_rank: 5, numeric_rank: 5 },
    { clearance_id: 4, name: "Level 4 (Secret)", rank: 4, clearance_rank: 4, numeric_rank: 4 },
    { clearance_id: 3, name: "Level 3 (Confidential)", rank: 3, clearance_rank: 3, numeric_rank: 3 },
    { clearance_id: 2, name: "Level 2 (Restricted)", rank: 2, clearance_rank: 2, numeric_rank: 2 },
    { clearance_id: 1, name: "Level 1 (Public)", rank: 1, clearance_rank: 1, numeric_rank: 1 },
  ],
  requests: [
    {
      request_id: 101,
      requester_name: "Mike Ross",
      resource_type: "Matter",
      resource_id: 3,
      requested_permission: "VIEW_CASE",
      status: "Approved",
      approved_by_name: "Jessica Pearson",
    },
    {
      request_id: 102,
      requester_name: "Rachel Zane",
      resource_type: "Document",
      resource_id: 105,
      requested_permission: "VIEW_DOCUMENT",
      status: "Pending",
      approved_by_name: "-",
    },
    {
      request_id: 103,
      requester_name: "Katrina Bennett",
      resource_type: "Matter",
      resource_id: 4,
      requested_permission: "EDIT_CASE",
      status: "Approved",
      approved_by_name: "Harvey Specter",
    },
    {
      request_id: 104,
      requester_name: "Mike Ross",
      resource_type: "Trust Account",
      resource_id: 1,
      requested_permission: "APPROVE_BILLING",
      status: "Rejected",
      approved_by_name: "Jessica Pearson",
    },
  ],
  delegations: [
    {
      delegation_id: 201,
      from_employee_name: "Harvey Specter",
      to_employee_name: "Katrina Bennett",
      permission_name: "APPROVE_BILLING",
      valid_from: "2026-03-20",
      valid_to: "2026-04-10",
      status: "Active",
    },
    {
      delegation_id: 202,
      from_employee_name: "Jessica Pearson",
      to_employee_name: "Harvey Specter",
      permission_name: "OVERRIDE_ACCESS",
      valid_from: "2026-01-01",
      valid_to: "2026-12-31",
      status: "Active",
    },
    {
      delegation_id: 203,
      from_employee_name: "Katrina Bennett",
      to_employee_name: "Mike Ross",
      permission_name: "UPLOAD_DOCUMENT",
      valid_from: "2026-03-15",
      valid_to: "2026-05-01",
      status: "Active",
    },
  ],
  violations: [
    {
      violation_id: 301,
      employee_name: "Mike Ross",
      attempted_resource_type: "Trust_Account",
      attempted_resource_id: 1,
      attempted_action: "DISBURSE",
      severity: "HIGH",
      reason: "Fiduciary trust disbursement attempted without Partner clearance rank",
    },
    {
      violation_id: 302,
      employee_name: "Rachel Zane",
      attempted_resource_type: "Document",
      attempted_resource_id: 103,
      attempted_action: "DELETE",
      severity: "CRITICAL",
      reason: "WORM Vault deletion blocked by active Litigation Legal Hold",
    },
    {
      violation_id: 303,
      employee_name: "Benjamin",
      attempted_resource_type: "Matter",
      attempted_resource_id: 2,
      attempted_action: "VIEW_CONFIDENTIAL",
      severity: "MEDIUM",
      reason: "Partitioned client privilege boundary access denied for IT role",
    },
  ],
};

export const mockDbmsTransactions: DbmsTransactionsResponse = {
  recent: [
    {
      txn_id: 901,
      txn_type: "TRUST_DEPOSIT",
      table_name: "trust_transaction",
      record_id: 1,
      action: "ALLOCATE_ESCROW",
      status: "COMMITTED",
      error_message: null,
      created_at: "2026-03-29T08:00:00",
    },
    {
      txn_id: 902,
      txn_type: "CASE_CREATION",
      table_name: "Cases",
      record_id: 5,
      action: "INSERT_MATTER",
      status: "COMMITTED",
      error_message: null,
      created_at: "2026-03-29T08:15:00",
    },
  ],
  failures: [],
  recovery_logs: [],
};

export const mockDbmsLocks: DbmsLockRecord[] = [
  {
    lock_id: 1,
    table_name: "Cases",
    record_id: 1,
    locked_by: 2,
    locked_by_name: "Harvey Specter",
    lock_reason: "Optimistic Concurrency Control Mutex",
    locked_at: "2026-03-29T08:30:00",
    released_at: null,
    status: "ACTIVE",
  },
];

export const mockDbmsCheckpoints: DbmsCheckpointRecord[] = [
  {
    checkpoint_id: 1,
    checkpoint_name: "DAILY_CONTINUITY_CHECKPOINT_20260329",
    notes: "Automated snapshot after three-way reconciliation balance verification.",
    created_at: "2026-03-29T06:00:00",
  },
];

export const mockDbmsCaseReports: DbmsCaseReportRecord[] = [
  {
    report_id: 1,
    case_id: 1,
    case_code: "MAT-2026-001",
    title: "Liberty Rail antitrust readiness",
    summary: "Active antitrust litigation proceeding to discovery.",
    total_billing: 420000,
    total_hours: 185.5,
    document_count: 8,
    generated_at: "2026-03-29T07:00:00",
  },
];

export const mockDbmsEmployeeReports: DbmsEmployeeReportRecord[] = [
  {
    report_id: 1,
    employee_id: 2,
    name: "Harvey Specter",
    summary: "Senior litigation workload exceeding Q1 targets.",
    active_cases: 4,
    total_hours: 320.5,
    tickets_raised: 2,
    generated_at: "2026-03-29T07:00:00",
  },
];

export const mockDbmsTicketReports: DbmsTicketReportRecord[] = [
  {
    report_id: 1,
    ticket_id: 1,
    summary: "Emergency matter file access grant SLA intact.",
    sla_status: "Within SLA",
    priority: "High",
    assigned_to_name: "Benjamin",
    generated_at: "2026-03-29T07:00:00",
  },
];

export const mockSystemTelemetry: SystemTelemetryResponse = {
  status: "healthy",
  cache: {
    backend: "Redis 7 / In-Memory Write-Through",
    redis_connected: true,
    hits: 4371,
    misses: 519,
    total_queries: 4890,
    hit_ratio_percent: 89.4,
    keys_in_memory: 312,
  },
  metrics: {
    uptime_seconds: 86400,
    total_requests: 12450,
    status_2xx: 12380,
    status_4xx: 65,
    status_5xx: 5,
    slow_requests_gt_1s: 2,
    avg_latency_ms: 18.5,
    p95_latency_ms: 45.2,
  },
};

export const mockAuthUser: AuthUserResponse = {
  employee_id: 1,
  id: 1,
  name: "Jessica Pearson",
  role_name: "Managing Partner",
  hierarchy_level: 1,
  department_name: "Executive",
  email: "jessica.pearson@pearsonspecter.example",
  clearance_rank: 5,
};

export const mockTokenResponse: TokenResponse = {
  access_token: "mock-jwt-token-lfms-enterprise",
  token_type: "bearer",
  user: mockAuthUser,
};

export function getMockClientTrustSummary(clientId: number): ClientTrustSummaryResponse {
  const c = mockClients.find((x) => x.client_id === clientId) || mockClients[0];
  const balance = clientId === 1 ? 100000.0 : clientId === 2 ? 75000.0 : 75000.0;
  return {
    client_id: c.client_id,
    client_name: c.name || "Client #" + clientId,
    trust_balance: balance,
    transaction_count: 3,
    transactions: [
      {
        transaction_id: 1,
        type: "DEPOSIT",
        amount: balance + 50000,
        client_running_balance: balance + 50000,
        reference_number: "IOLTA-DEP-001",
        payee_or_payor: c.organization || c.name || "Client",
        description: "Initial retainer deposit for legal services",
        created_at: "2026-01-15T10:00:00",
      },
      {
        transaction_id: 2,
        type: "DISBURSEMENT",
        amount: 25000,
        client_running_balance: balance + 25000,
        reference_number: "IOLTA-DISB-001",
        payee_or_payor: "Filing Fees & Expert Witnesses",
        description: "Court filing fees and deposition transcripts",
        created_at: "2026-02-10T14:30:00",
      },
      {
        transaction_id: 3,
        type: "FEE_TRANSFER",
        amount: 25000,
        client_running_balance: balance,
        reference_number: "IOLTA-XFR-001",
        payee_or_payor: "PSL Law Operating Account",
        description: "Earned attorney fee transfer following approved invoice",
        created_at: "2026-03-01T16:00:00",
      },
    ],
  };
}

export function getMockCaseDetail(caseId: number): CaseDetailRecord {
  const c = mockCases.find((x) => x.case_id === caseId) || mockCases[0];
  return {
    case_id: c.case_id,
    case_code: c.case_code,
    title: c.title,
    description: c.description,
    case_type: c.case_type,
    status: c.status,
    confidentiality_level: c.confidentiality_level,
    start_date: c.start_date,
    end_date: c.end_date,
    created_by: {
      employee_id: 1,
      name: "Jessica Pearson",
    },
    client: {
      client_id: c.client_id,
      name: c.client_name,
      organization: c.client_name,
      contact_info: "contact@enterprise.example",
      display_name: c.client_name,
    },
    lead_partner: {
      employee_id: c.lead_partner_id,
      name: c.lead_partner_name,
      email: "partner@pearsonspecter.example",
    },
    lead_senior: {
      employee_id: c.lead_senior_id,
      name: c.lead_senior_name,
      email: "senior@pearsonspecter.example",
    },
    metrics: {
      team_size: c.team_size || 4,
      document_count: c.document_count || 6,
      billed_total: c.billed_total || 250000,
      total_hours: c.total_hours || 120,
    },
    next_hearing: {
      hearing_id: 1,
      date: "2026-04-14T09:30:00",
      notes: "Preliminary hearing session",
      court_name: "Delaware Court of Chancery",
      location: "Wilmington, DE",
    },
    hearings: [
      {
        hearing_id: 1,
        date: "2026-04-14T09:30:00",
        notes: "Preliminary hearing session",
        court_name: "Delaware Court of Chancery",
        location: "Wilmington, DE",
      },
    ],
  };
}

export function getEmpIdFromPath(path: string): number {
  if (path.includes("?")) {
    const params = new URLSearchParams(path.split("?")[1]);
    const parsed = Number(params.get("employee_id"));
    if (parsed) return parsed;
  }
  if (typeof window !== "undefined") {
    const stored = Number(localStorage.getItem("lfms_employee_id"));
    if (stored) return stored;
  }
  return 1;
}

export function getFilteredCasesForEmployee(employeeId: number): CaseRecord[] {
  // 1: Jessica Pearson (Managing Partner) -> Firm-wide executive visibility (All 6 matters)
  if (employeeId === 1) {
    return mockCases;
  }
  // 2: Harvey Specter (Partner) -> Lead Litigation Partner on matters 1, 2, 4, 5 (4 matters)
  if (employeeId === 2) {
    return mockCases.filter((c) => [1, 2, 4, 5].includes(c.case_id));
  }
  // 5: Katrina Bennett (Senior Associate) -> Lead Senior Counsel on matters 1, 3, 5, 6 (4 matters)
  if (employeeId === 5) {
    return mockCases.filter((c) => [1, 3, 5, 6].includes(c.case_id));
  }
  // 6: Mike Ross (Associate) -> Staff Associate on matters 1, 2 (2 matters)
  if (employeeId === 6) {
    return mockCases.filter((c) => [1, 2].includes(c.case_id));
  }
  // 7: Rachel Zane (Paralegal) -> Support on matter 1 (1 matter)
  if (employeeId === 7) {
    return mockCases.filter((c) => [1].includes(c.case_id));
  }
  // 8: Benjamin (IT Admin) -> Technical infrastructure/eDiscovery on matter 1 (1 matter)
  if (employeeId === 8) {
    return mockCases.filter((c) => [1].includes(c.case_id));
  }
  return mockCases.filter(
    (c) => c.lead_partner_id === employeeId || c.lead_senior_id === employeeId || c.case_id === 1
  );
}

export function getFilteredOverviewForEmployee(employeeId: number): OverviewResponse {
  const userCases = getFilteredCasesForEmployee(employeeId);
  const userTrackedRevenue = userCases.reduce((sum, c) => sum + (c.billed_total || 0), 0);

  const priorityMatters = userCases.slice(0, 4).map((c) => ({
    case_id: c.case_id,
    case_code: c.case_code || `MAT-2026-00${c.case_id}`,
    title: c.title || "",
    case_type: c.case_type || "Litigation",
    status: c.status || "Open",
    confidentiality_level: c.confidentiality_level || "Internal",
    client_name: c.client_name || "Enterprise Client",
    lead_partner_name: c.lead_partner_name || "Harvey Specter",
    lead_senior_name: c.lead_senior_name || "Katrina Bennett",
    start_date: c.start_date || "2026-01-10",
    end_date: c.end_date || "2026-06-30",
  }));

  return {
    ...mockOverview,
    summary: {
      ...mockOverview.summary,
      open_matters: userCases.length,
      tracked_revenue: userTrackedRevenue,
    },
    priority_matters: priorityMatters,
  };
}

export function resolveMockData(path: string, _method = "GET", _body?: any): any {
  const cleanPath = path.split("?")[0];
  const empId = getEmpIdFromPath(path);

  if (cleanPath === "/overview") return getFilteredOverviewForEmployee(empId);
  if (cleanPath === "/analytics") return mockAnalytics;
  if (cleanPath === "/clients") return mockClients;
  if (cleanPath === "/cases") return getFilteredCasesForEmployee(empId);
  if (cleanPath.startsWith("/cases/")) {
    const parts = cleanPath.split("/");
    const id = Number(parts[2]) || 1;
    if (parts.length === 3) return getMockCaseDetail(id);
    if (parts[3] === "team") {
      const teamResp: CaseTeamResponse = {
        case_id: id,
        team: [
          {
            employee_id: 2,
            role_in_case: "Lead Partner",
            assigned_by: 1,
            assigned_by_name: "Jessica Pearson",
            name: "Harvey Specter",
            email: "harvey.specter@pearsonspecter.example",
            phone: "+1-212-555-0102",
            status: "Active",
            employment_type: "Equity",
            department_name: "Litigation",
            role_name: "Partner",
            hierarchy_level: 2,
          },
          {
            employee_id: 5,
            role_in_case: "Lead Senior",
            assigned_by: 2,
            assigned_by_name: "Harvey Specter",
            name: "Katrina Bennett",
            email: "katrina.bennett@pearsonspecter.example",
            phone: "+1-212-555-0105",
            status: "Active",
            employment_type: "Full-Time",
            department_name: "Litigation",
            role_name: "Senior Associate",
            hierarchy_level: 3,
          },
        ],
      };
      return teamResp;
    }
    if (parts[3] === "documents") {
      const docResp: CaseDocumentsResponse = {
        case_id: id,
        documents: mockDocuments,
      };
      return docResp;
    }
    if (parts[3] === "status-history") {
      const histResp: CaseStatusHistoryResponse = {
        case_id: id,
        history: [
          { history_id: 1, old_status: "Drafting", new_status: "Open", changed_by: 1, changed_by_name: "Jessica Pearson", timestamp: "2026-01-10T10:00:00" },
          { history_id: 2, old_status: "Open", new_status: "Hearing Scheduled", changed_by: 2, changed_by_name: "Harvey Specter", timestamp: "2026-02-15T14:30:00" },
        ],
      };
      return histResp;
    }
    if (parts[3] === "billing") {
      const billingResp: CaseBillingResponse = {
        case_id: id,
        summary: {
          bill_count: 2,
          total_amount: 213500,
          approved_amount: 125000,
          pending_amount: 88500,
          total_hours: 185.5,
          time_log_count: 14,
        },
        entries: [
          { bill_id: 1, amount: 125000, status: "Approved", generated_by: 5, generated_by_name: "Katrina Bennett", approved_by: 2, approved_by_name: "Harvey Specter" },
          { bill_id: 2, amount: 88500, status: "Pending", generated_by: 6, generated_by_name: "Mike Ross", approved_by: null, approved_by_name: null },
        ],
      };
      return billingResp;
    }
    if (parts[3] === "legal-hold") {
      return { case_id: id, legal_hold: false, title: "Matter " + id };
    }
  }

  if (cleanPath === "/tickets") return mockTickets;
  if (cleanPath === "/documents") return mockDocuments;
  if (cleanPath === "/employees") return mockEmployees;
  if (cleanPath === "/roles") {
    return [
      { role_id: 1, role_name: "Managing Partner", hierarchy_level: 1 },
      { role_id: 2, role_name: "Partner", hierarchy_level: 2 },
      { role_id: 3, role_name: "Senior Associate", hierarchy_level: 3 },
      { role_id: 4, role_name: "Associate", hierarchy_level: 4 },
      { role_id: 5, role_name: "Paralegal", hierarchy_level: 5 },
      { role_id: 8, role_name: "Finance Admin", hierarchy_level: 4 },
      { role_id: 7, role_name: "IT Admin", hierarchy_level: 4 },
    ];
  }

  // --- Trust & IOLTA Endpoints ---
  if (cleanPath === "/trust/accounts") return mockTrustAccounts;
  if (cleanPath.startsWith("/trust/clients/")) {
    const clientId = Number(cleanPath.split("/")[3]) || 1;
    return getMockClientTrustSummary(clientId);
  }
  if (cleanPath.startsWith("/trust/summary")) {
    const clientId = Number(cleanPath.split("/")[3]) || 1;
    return getMockClientTrustSummary(clientId);
  }
  if (cleanPath.startsWith("/trust/reconciliation")) {
    const reconResp: ThreeWayReconciliationResponse = {
      reconciliation_id: 1,
      account_id: 1,
      account_name: "Primary Client Trust Account (IOLTA)",
      statement_date: "2026-03-31",
      bank_statement_balance: 250000.0,
      general_ledger_balance: 250000.0,
      client_ledger_balance: 250000.0,
      variance: 0.0,
      status: "BALANCED",
      is_balanced: true,
      client_count: 3,
      client_breakdown: [
        { client_id: 1, client_name: "Liberty Rail Holdings", trust_balance: 100000.0 },
        { client_id: 2, client_name: "Blue Ridge Capital", trust_balance: 75000.0 },
        { client_id: 3, client_name: "Monarch Aviation Group", trust_balance: 75000.0 },
      ],
      reconciled_at: "2026-03-31T23:59:59",
      notes: "Three-way fiduciary reconciliation balanced with zero variance.",
    };
    return reconResp;
  }
  if (cleanPath === "/trust/deposit") {
    return {
      transaction_id: 99,
      account_id: 1,
      client_id: 1,
      amount: 50000.0,
      account_running_balance: 300000.0,
      client_running_balance: 150000.0,
      message: "Deposit credited to IOLTA Client Trust Account.",
    };
  }
  if (cleanPath === "/trust/disburse") {
    return {
      transaction_id: 100,
      amount: 15000.0,
      account_running_balance: 235000.0,
      client_running_balance: 85000.0,
      message: "Disbursement executed under ABA Model Rule 1.15.",
    };
  }
  if (cleanPath === "/trust/transfer-earned-fee") {
    return {
      message: "Earned attorney fee transferred to Operating Account.",
      amount: 25000.0,
      iolta_balance: 225000.0,
      operating_balance: 775000.0,
      client_remaining_trust: 75000.0,
      transfer_reference: "XFR-EARNED-FEE-20260329",
    };
  }

  // --- Billing & LEDES ---
  if (cleanPath === "/billing/utbms-codes") {
    const utbmsResp: UtbmsReferenceResponse = {
      task_codes: [
        { code: "L110", description: "Fact Investigation/Development" },
        { code: "L120", description: "Analysis/Strategy" },
        { code: "L130", description: "Experts/Consultants" },
        { code: "L210", description: "Pleadings" },
        { code: "L220", description: "Preliminary Injunctions" },
      ],
      activity_codes: [
        { code: "A101", description: "Plan and prepare for" },
        { code: "A102", description: "Research" },
        { code: "A103", description: "Draft/revise" },
        { code: "A104", description: "Review/analyze" },
      ],
      expense_codes: [
        { code: "E101", description: "Copying" },
        { code: "E105", description: "Telephone" },
        { code: "E108", description: "Postage" },
      ],
    };
    return utbmsResp;
  }
  if (cleanPath.startsWith("/billing/") && cleanPath.endsWith("/ledes")) {
    const billId = Number(cleanPath.split("/")[2]) || 1;
    const ledesResp: LedesInvoiceResponse = {
      bill_id: billId,
      invoice_number: "INV-2026-0042",
      file_name: "INV_2026_0042_ledes1998b.txt",
      total_amount: 125000.0,
      line_item_count: 6,
      is_valid: true,
      validation_errors: [],
      file_content: "INVOICE_DATE[]|INVOICE_NUMBER[INV-2026-0042]|CLIENT_ID[1]|LAW_FIRM_MATTER_ID[MAT-2026-001]|INVOICE_TOTAL[125000.00]|BILLING_START_DATE[20260101]|BILLING_END_DATE[20260131]|LINE_ITEM_NUMBER[1]...",
    };
    return ledesResp;
  }

  // --- Conflicts ---
  if (cleanPath.startsWith("/conflicts/cases/") && cleanPath.endsWith("/adverse-parties")) {
    const caseId = Number(cleanPath.split("/")[3]) || 1;
    const parties: AdversePartyRecord[] = [
      {
        party_id: 1,
        case_id: caseId,
        party_name: "Apex Global Competitor LLC",
        party_type: "Adverse Party",
        corporate_affiliate: "Apex Transport Holdings Inc.",
        added_at: "2026-01-15T10:00:00",
      },
    ];
    return parties;
  }
  if (cleanPath.startsWith("/conflicts/check")) {
    const conflictResp: ConflictCheckResponse = {
      query: "General adverse check",
      search_terms: ["Apex", "Global"],
      status: "CLEARED",
      risk_level: "CLEARED",
      risk_score: 0.0,
      match_count: 0,
      matches: [],
      ethical_rule: "ABA Model Rule 1.7 & 1.9 Conflict of Interest Clearance",
      ethical_wall_required: false,
      recommendation: "Clearance granted. No active adverse party representation conflict identified.",
      checked_at: new Date().toISOString(),
    };
    return conflictResp;
  }

  // --- AI Document / Semantic Search ---
  if (cleanPath === "/api/search" || cleanPath.startsWith("/documents/search")) {
    return {
      query: "contract clause",
      total: 3,
      total_matches: 3,
      results: [
        {
          id: 101,
          title: "Antitrust Pre-Trial Defense Brief",
          case_code: "MAT-2026-001",
          snippet: "Cross-corridor market power and regulatory carve-outs under Clayton Act § 7.",
          score: 0.96,
          file_name: "Liberty_Rail_Antitrust_Defense_Brief_v3.pdf",
        },
        {
          id: 102,
          title: "Emergency Motion for Injunction",
          case_code: "MAT-2026-002",
          snippet: "Uncapped poison-pill fiduciary protections under Delaware General Corporation Law.",
          score: 0.91,
          file_name: "Blue_Ridge_Delaware_Chancery_Injunction_Motion.pdf",
        },
        {
          id: 103,
          title: "Due Diligence Audit & IP Assessment",
          case_code: "MAT-2026-005",
          snippet: "Patent portfolio freedom-to-operate and clinical trial indemnification provisions.",
          score: 0.88,
          file_name: "Sterling_Biotech_Due_Diligence_Report_Final.pdf",
        },
      ],
      hits: mockDocuments.map((d) => ({
        document_id: d.document_id,
        case_id: d.case_id || 1,
        case_code: "MAT-2026-001",
        case_title: "Antitrust matter",
        file_name: d.file_name || "Brief.pdf",
        snippet: "Verified legal clause matching query parameters with zero indemnity exposure.",
        score: 0.94,
      })),
    };
  }

  if (cleanPath === "/access/dashboard") return mockAccessDashboard;
  if (cleanPath === "/system/telemetry") return mockSystemTelemetry;
  if (cleanPath === "/dbms/transactions") return mockDbmsTransactions;
  if (cleanPath === "/dbms/locks") return mockDbmsLocks;
  if (cleanPath === "/dbms/checkpoint/list" || cleanPath.startsWith("/dbms/checkpoint")) return mockDbmsCheckpoints;
  if (cleanPath === "/dbms/reports/cases") return mockDbmsCaseReports;
  if (cleanPath === "/dbms/reports/employees") return mockDbmsEmployeeReports;
  if (cleanPath === "/dbms/reports/tickets") return mockDbmsTicketReports;

  if (cleanPath === "/auth/me") return mockAuthUser;
  if (cleanPath.startsWith("/auth/switch-persona") || cleanPath.startsWith("/auth/login")) return mockTokenResponse;
  if (cleanPath === "/auth/logout") return { message: "Logged out successfully" };

  if (cleanPath === "/health") {
    return {
      status: "ok",
      database: "connected (enterprise mode)",
      database_time: new Date().toISOString(),
    };
  }

  // Generic fallback for mutations and unrecognized GETs
  return {
    status: "success",
    message: "Operation completed successfully.",
    data: {},
  };
}
