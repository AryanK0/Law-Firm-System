export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface CaseRecord {
  case_id: number;
  case_code: string | null;
  title: string | null;
  description: string | null;
  case_type: string | null;
  client_id: number | null;
  client_name: string | null;
  lead_partner_id: number | null;
  lead_partner_name: string | null;
  lead_senior_id: number | null;
  lead_senior_name: string | null;
  status: string | null;
  confidentiality_level: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  start_date: string | null;
  end_date: string | null;
  team_size?: number;
  document_count?: number;
  billed_total?: number;
  total_hours?: number;
}

export interface CaseDetailRecord {
  case_id: number;
  case_code: string | null;
  title: string | null;
  description: string | null;
  case_type: string | null;
  status: string | null;
  confidentiality_level: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: {
    employee_id: number | null;
    name: string | null;
  };
  client: {
    client_id: number | null;
    name: string | null;
    organization: string | null;
    contact_info: string | null;
    display_name: string | null;
  };
  lead_partner: {
    employee_id: number | null;
    name: string | null;
    email: string | null;
  };
  lead_senior: {
    employee_id: number | null;
    name: string | null;
    email: string | null;
  };
  metrics: {
    team_size: number;
    document_count: number;
    billed_total: number;
    total_hours: number;
  };
  next_hearing: {
    hearing_id: number;
    date: string | null;
    notes: string | null;
    court_name: string | null;
    location: string | null;
  } | null;
  hearings: {
    hearing_id: number;
    date: string | null;
    notes: string | null;
    court_name: string | null;
    location: string | null;
  }[];
}

export interface CaseTeamMember {
  employee_id: number;
  role_in_case: string | null;
  assigned_by: number | null;
  assigned_by_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  employment_type: string | null;
  department_name: string | null;
  role_name: string | null;
  hierarchy_level: number | null;
}

export interface CaseTeamResponse {
  case_id: number;
  team: CaseTeamMember[];
}

export interface DocumentRecord {
  document_id: number;
  case_id: number | null;
  uploaded_by: number | null;
  confidentiality_level: string | null;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string | null;
  case_code?: string | null;
  case_title?: string | null;
  uploaded_by_name: string | null;
  latest_version?: number | null;
  version_count?: number | null;
  last_modified_at?: string | null;
}

export interface CaseDocumentsResponse {
  case_id: number;
  documents: DocumentRecord[];
}

export interface CaseStatusHistoryEntry {
  history_id: number;
  old_status: string | null;
  new_status: string | null;
  changed_by: number | null;
  changed_by_name: string | null;
  timestamp: string | null;
}

export interface CaseStatusHistoryResponse {
  case_id: number;
  history: CaseStatusHistoryEntry[];
}

export interface CaseBillingEntry {
  bill_id: number;
  amount: number;
  status: string | null;
  generated_by: number | null;
  generated_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
}

export interface CaseBillingResponse {
  case_id: number;
  summary: {
    bill_count: number;
    total_amount: number;
    approved_amount: number;
    pending_amount: number;
    total_hours: number;
    time_log_count: number;
  };
  entries: CaseBillingEntry[];
}

export interface TicketRecord {
  ticket_id: number;
  raised_by: number | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  assigned_to: number | null;
  created_at: string | null;
  resolution_deadline: string | null;
  resolved_at: string | null;
  breach_flag: boolean | null;
  raised_by_name: string | null;
  assigned_to_name: string | null;
}

export interface EmployeeRecord {
  employee_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  employment_type: string | null;
  department_name: string | null;
  role_name: string | null;
  hierarchy_level: number | null;
  access_level: string | null;
  supervisor_name: string | null;
}

export interface ClientRecord {
  client_id: number;
  name: string | null;
  organization: string | null;
  contact_info: string | null;
}

export interface AnalyticsPoint {
  name: string;
  value: number;
}

export interface BillingPoint {
  name: string;
  amount: number;
}

export interface AnalyticsResponse {
  summary: {
    total_cases: number;
    open_cases: number;
    total_tickets: number;
    breached_tickets: number;
    documents: number;
  };
  case_status: AnalyticsPoint[];
  billing: BillingPoint[];
  ticket_status: AnalyticsPoint[];
  roles: AnalyticsPoint[];
}

export interface HealthResponse {
  status: string;
  database?: string;
  database_time?: string | null;
}

export interface OverviewPersonRecord {
  employee_id: number;
  name: string;
  role_name: string | null;
  department_name: string | null;
  status: string | null;
  employment_type: string | null;
  supervisor_name: string | null;
  access_level: string | null;
}

export interface RoleAccessRecord {
  role_id: number;
  role_name: string;
  hierarchy_level: number;
  access_level: string;
  permissions: string;
}

export interface OverviewMatterRecord {
  case_id: number;
  case_code: string;
  title: string | null;
  case_type: string | null;
  status: string | null;
  confidentiality_level: string | null;
  client_name: string | null;
  lead_partner_name: string | null;
  lead_senior_name: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface HearingRecord {
  hearing_id: number;
  date: string;
  notes: string | null;
  case_id: number;
  case_code: string;
  title: string | null;
  court_name: string | null;
  location: string | null;
}

export interface DocumentFeedRecord {
  document_id: number;
  created_at: string;
  confidentiality_level: string | null;
  file_path: string | null;
  case_code: string;
  title: string | null;
  uploaded_by_name: string | null;
}

export interface SupportWatchRecord {
  ticket_id: number;
  description: string | null;
  priority: string | null;
  status: string | null;
  resolution_deadline: string | null;
  breach_flag: boolean | null;
  raised_by_name: string | null;
  assigned_to_name: string | null;
}

export interface DepartmentCoveragePoint {
  name: string;
  headcount: number;
}

export interface ClientPortfolioRecord {
  client_id: number;
  client_name: string;
  matter_count: number;
  billed_total: number;
  last_contact: string | null;
}

export interface RecentInteractionRecord {
  interaction_id: number;
  interaction_type: string | null;
  notes: string | null;
  datetime: string | null;
  client_name: string;
  employee_name: string | null;
}

export interface BillingWatchRecord {
  bill_id: number;
  amount: number;
  status: string | null;
  case_code: string;
  title: string | null;
  client_name: string | null;
  generated_by_name: string | null;
  approved_by_name: string | null;
}

export interface OverviewResponse {
  firm: {
    name: string;
    tagline: string;
  };
  summary: {
    active_people: number;
    open_matters: number;
    upcoming_hearings: number;
    open_tickets: number;
    active_clients: number;
    tracked_revenue: number;
    pending_bills: number;
    sla_risk: number;
  };
  featured_people: OverviewPersonRecord[];
  role_access: RoleAccessRecord[];
  priority_matters: OverviewMatterRecord[];
  upcoming_hearings: HearingRecord[];
  recent_documents: DocumentFeedRecord[];
  support_watch: SupportWatchRecord[];
  department_coverage: DepartmentCoveragePoint[];
  client_portfolio: ClientPortfolioRecord[];
  recent_interactions: RecentInteractionRecord[];
  billing_watch: BillingWatchRecord[];
}

interface UploadResponse {
  message: string;
  document_id: number;
  file_name: string;
  file_path: string;
  file_url: string;
}

export interface CreateCasePayload {
  title: string;
  description?: string;
  client_id: number;
  case_code?: string;
  case_type?: string;
  lead_partner_id?: number;
  lead_senior_id?: number;
  status?: string;
  confidentiality_level?: string;
  created_by?: number;
  start_date?: string;
  end_date?: string;
}

export interface CreateTicketPayload {
  raised_by: number;
  description: string;
  priority?: string;
  status?: string;
  assigned_to?: number;
  resolution_deadline?: string;
}

export interface CreateClientPayload {
  name?: string;
  organization?: string;
  contact_info?: string;
}

export interface ResolveTicketPayload {
  resolved_by: number;
}

function buildPath(path: string, searchParams?: URLSearchParams) {
  if (!searchParams || Array.from(searchParams.keys()).length === 0) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}${path}?${searchParams.toString()}`;
}

function withEmployee(employeeId: number) {
  const searchParams = new URLSearchParams();
  searchParams.set("employee_id", String(employeeId));
  return searchParams;
}

export function getDocumentDownloadUrl(documentId: number, employeeId?: number) {
  return buildPath(
    `/documents/${documentId}/download`,
    typeof employeeId === "number" ? withEmployee(employeeId) : undefined,
  );
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
): Promise<T> {
  const response = await fetch(buildPath(path, searchParams), init);

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;

    try {
      const errorBody = (await response.json()) as { detail?: string };
      if (errorBody.detail) {
        detail = errorBody.detail;
      }
    } catch {
      // Use default message for non-JSON responses.
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function getCases(employeeId: number) {
  return requestJson<CaseRecord[]>("/cases", undefined, withEmployee(employeeId));
}

export function getCaseDetail(caseId: number, employeeId: number) {
  return requestJson<CaseDetailRecord>(
    `/cases/${caseId}`,
    undefined,
    withEmployee(employeeId),
  );
}

export function getCaseTeam(caseId: number, employeeId: number) {
  return requestJson<CaseTeamResponse>(
    `/cases/${caseId}/team`,
    undefined,
    withEmployee(employeeId),
  );
}

export function getCaseDocuments(caseId: number, employeeId: number) {
  return requestJson<CaseDocumentsResponse>(
    `/cases/${caseId}/documents`,
    undefined,
    withEmployee(employeeId),
  );
}

export function getCaseStatusHistory(caseId: number, employeeId: number) {
  return requestJson<CaseStatusHistoryResponse>(
    `/cases/${caseId}/status-history`,
    undefined,
    withEmployee(employeeId),
  );
}

export function getCaseBilling(caseId: number, employeeId: number) {
  return requestJson<CaseBillingResponse>(
    `/cases/${caseId}/billing`,
    undefined,
    withEmployee(employeeId),
  );
}

export function getClients() {
  return requestJson<ClientRecord[]>("/clients");
}

export function getDocuments(employeeId?: number) {
  return requestJson<DocumentRecord[]>(
    "/documents",
    undefined,
    typeof employeeId === "number" ? withEmployee(employeeId) : undefined,
  );
}

export function getAnalytics() {
  return requestJson<AnalyticsResponse>("/analytics");
}

export function getOverview() {
  return requestJson<OverviewResponse>("/overview");
}

export function getHealth() {
  return requestJson<HealthResponse>("/health");
}

export function getTickets() {
  return requestJson<TicketRecord[]>("/tickets");
}

export function getEmployees() {
  return requestJson<EmployeeRecord[]>("/employees");
}

export function createCase(payload: CreateCasePayload) {
  return requestJson<CaseDetailRecord>("/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createTicket(payload: CreateTicketPayload) {
  return requestJson<TicketRecord>("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function resolveTicket(ticketId: number, payload: ResolveTicketPayload) {
  return requestJson<TicketRecord>(`/tickets/${ticketId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createClient(payload: CreateClientPayload) {
  return requestJson<ClientRecord>("/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadDocument(
  caseId: number,
  file: File,
  uploadedBy?: number,
  confidentialityLevel = "Internal",
) {
  const formData = new FormData();
  formData.append("file", file);

  const searchParams = new URLSearchParams({
    case_id: String(caseId),
    confidentiality_level: confidentialityLevel,
  });

  if (typeof uploadedBy === "number") {
    searchParams.set("uploaded_by", String(uploadedBy));
  }

  return requestJson<UploadResponse>("/upload-document/", {
    method: "POST",
    body: formData,
  }, searchParams);
}
