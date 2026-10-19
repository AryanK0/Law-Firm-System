export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "";

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

export interface PresignUploadResponse {
  case_id: number;
  file_name: string;
  confidentiality_level: string;
  s3_key: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  encryption: string;
}

export interface ConfirmUploadPayload {
  case_id: number;
  file_name: string;
  s3_key: string;
  confidentiality_level?: string;
  file_size_bytes?: number;
  sha256_checksum?: string;
}

export interface SearchHit {
  document_id: number;
  case_id: number;
  case_code?: string;
  case_title?: string;
  file_name: string;
  snippet: string;
  score: number;
}

export interface SearchResults {
  query: string;
  total_matches: number;
  hits: SearchHit[];
}

export interface LegalHoldRecord {
  case_id: number;
  title?: string;
  legal_hold: boolean;
  legal_hold_reason?: string | null;
  legal_hold_by?: number | null;
  legal_hold_at?: string | null;
  message?: string;
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

export interface DbmsTransactionRecord {
  txn_id: number;
  txn_type: string;
  table_name: string;
  record_id: number | null;
  action: string;
  status: string;
  error_message: string | null;
  created_at: string | null;
}

export interface DbmsTransactionsResponse {
  recent: DbmsTransactionRecord[];
  failures: DbmsTransactionRecord[];
  recovery_logs: DbmsTransactionRecord[];
}

export interface DbmsLockRecord {
  lock_id: number;
  table_name: string;
  record_id: number;
  locked_by: number | null;
  locked_by_name: string | null;
  lock_reason: string | null;
  locked_at: string | null;
  released_at: string | null;
  status: string;
}

export interface DbmsCheckpointRecord {
  checkpoint_id: number;
  checkpoint_name: string;
  notes: string | null;
  created_at: string | null;
}

export interface DbmsCaseReportRecord {
  report_id: number;
  case_id: number;
  case_code: string;
  title: string | null;
  summary: string;
  total_billing: number;
  total_hours: number;
  document_count: number;
  generated_at: string | null;
}

export interface DbmsEmployeeReportRecord {
  report_id: number;
  employee_id: number;
  name: string;
  summary: string;
  active_cases: number;
  total_hours: number;
  tickets_raised: number;
  generated_at: string | null;
}

export interface DbmsTicketReportRecord {
  report_id: number;
  ticket_id: number;
  summary: string;
  sla_status: string;
  priority: string | null;
  assigned_to_name: string | null;
  generated_at: string | null;
}

export interface CreateCheckpointPayload {
  name?: string;
  notes?: string;
}

export interface UpdateCaseAccessPayload {
  approver_id: number;
  employee_id: number;
  case_id: number;
  case_role?: string;
  can_view: boolean;
  can_edit: boolean;
  can_upload_docs: boolean;
  can_approve_docs: boolean;
  can_close_case: boolean;
  can_assign_members: boolean;
}

export interface AccessDashboardResponse {
  hierarchy: Array<Record<string, string | number | boolean | null>>;
  permissions: Array<Record<string, string | number | boolean | null>>;
  matrix: Array<Record<string, string | number | boolean | null>>;
  case_access: Array<Record<string, string | number | boolean | null>>;
  clearances: Array<Record<string, string | number | boolean | null>>;
  violations: Array<Record<string, string | number | boolean | null>>;
  delegations: Array<Record<string, string | number | boolean | null>>;
  requests: Array<Record<string, string | number | boolean | null>>;
}

export interface AuthUserResponse {
  employee_id: number;
  id: number;
  name: string;
  role_name: string;
  hierarchy_level: number;
  department_name?: string | null;
  email?: string | null;
  clearance_rank: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUserResponse;
}

let currentAuthToken: string | null =
  typeof window !== "undefined"
    ? localStorage.getItem("lfms_access_token")
    : null;

let currentEmployeeId: number | null =
  typeof window !== "undefined"
    ? Number(localStorage.getItem("lfms_employee_id")) || null
    : null;

export function setAuthToken(token: string | null, employeeId?: number | null) {
  currentAuthToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("lfms_access_token", token);
    } else {
      localStorage.removeItem("lfms_access_token");
    }
    if (typeof employeeId === "number") {
      currentEmployeeId = employeeId;
      localStorage.setItem("lfms_employee_id", String(employeeId));
    }
  }
}

export function getAuthToken() {
  return currentAuthToken;
}

export function getCurrentEmployeeId() {
  return currentEmployeeId;
}

function buildPath(path: string, searchParams?: URLSearchParams) {
  if (!searchParams || Array.from(searchParams.keys()).length === 0) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}${path}?${searchParams.toString()}`;
}

export function getDocumentDownloadUrl(documentId: number, _employeeId?: number) {
  return buildPath(`/documents/${documentId}/download`);
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
): Promise<T> {
  // 1. Recover token from localStorage if missing in memory
  if (!currentAuthToken && typeof window !== "undefined") {
    currentAuthToken = localStorage.getItem("lfms_access_token");
  }

  // 2. If still missing and not an auth call, acquire persona token immediately
  if (!currentAuthToken && !path.startsWith("/auth/") && typeof window !== "undefined") {
    const targetEmpId = currentEmployeeId || Number(localStorage.getItem("lfms_employee_id")) || 1;
    try {
      const authRes = await fetch(buildPath("/auth/switch-persona"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: targetEmpId }),
        credentials: "include",
      });
      if (authRes.ok) {
        const tokenData = (await authRes.json()) as TokenResponse;
        if (tokenData?.access_token) {
          setAuthToken(tokenData.access_token, targetEmpId);
        }
      }
    } catch {
      // Continue to fetch attempt
    }
  }

  const headers = new Headers(init?.headers || {});
  if (currentAuthToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${currentAuthToken}`);
  }
  if (currentEmployeeId && !headers.has("X-Employee-Id")) {
    headers.set("X-Employee-Id", String(currentEmployeeId));
  }

  let response = await fetch(buildPath(path, searchParams), {
    ...init,
    headers,
    credentials: "include",
  });

  // 3. Self-healing: if 401 Unauthorized received, renew token and retry once
  if (response.status === 401 && !path.startsWith("/auth/") && typeof window !== "undefined") {
    const targetEmpId = currentEmployeeId || Number(localStorage.getItem("lfms_employee_id")) || 1;
    try {
      const retryAuthRes = await fetch(buildPath("/auth/switch-persona"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: targetEmpId }),
        credentials: "include",
      });
      if (retryAuthRes.ok) {
        const refreshedTokenData = (await retryAuthRes.json()) as TokenResponse;
        if (refreshedTokenData?.access_token) {
          setAuthToken(refreshedTokenData.access_token, targetEmpId);
          headers.set("Authorization", `Bearer ${refreshedTokenData.access_token}`);
          headers.set("X-Employee-Id", String(targetEmpId));
          response = await fetch(buildPath(path, searchParams), {
            ...init,
            headers,
            credentials: "include",
          });
        }
      }
    } catch {
      // Proceed to standard error handling
    }
  }

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

// --- Auth Endpoints ---

export async function loginWithCredentials(employeeId: number, password = "Password123!") {
  const data = await requestJson<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_id: employeeId, password }),
  });
  setAuthToken(data.access_token, data.user.employee_id);
  return data;
}

export async function switchPersona(employeeId: number) {
  const data = await requestJson<TokenResponse>("/auth/switch-persona", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_id: employeeId }),
  });
  setAuthToken(data.access_token, data.user.employee_id);
  return data;
}

export function getAuthMe() {
  return requestJson<AuthUserResponse>("/auth/me");
}

export async function logoutUser() {
  try {
    await requestJson<{ message: string }>("/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null, null);
  }
}

// --- Case & Operational Endpoints ---

export function getCases(_employeeId?: number) {
  return requestJson<CaseRecord[]>("/cases");
}

export function getCaseDetail(caseId: number, _employeeId?: number) {
  return requestJson<CaseDetailRecord>(`/cases/${caseId}`);
}

export function getCaseTeam(caseId: number, _employeeId?: number) {
  return requestJson<CaseTeamResponse>(`/cases/${caseId}/team`);
}

export function getCaseDocuments(caseId: number, _employeeId?: number) {
  return requestJson<CaseDocumentsResponse>(`/cases/${caseId}/documents`);
}

export function getCaseStatusHistory(caseId: number, _employeeId?: number) {
  return requestJson<CaseStatusHistoryResponse>(`/cases/${caseId}/status-history`);
}

export function getCaseBilling(caseId: number, _employeeId?: number) {
  return requestJson<CaseBillingResponse>(`/cases/${caseId}/billing`);
}

export function getClients() {
  return requestJson<ClientRecord[]>("/clients");
}

export function getDocuments(_employeeId?: number) {
  return requestJson<DocumentRecord[]>("/documents");
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

export function getDbmsTransactions(_employeeId?: number) {
  return requestJson<DbmsTransactionsResponse>("/dbms/transactions");
}

export function getDbmsLocks(_employeeId?: number) {
  return requestJson<DbmsLockRecord[]>("/dbms/locks");
}

export function getDbmsCheckpoints(_employeeId?: number) {
  return requestJson<DbmsCheckpointRecord[]>("/dbms/checkpoint/list");
}

export function createDbmsCheckpoint(_employeeId?: number, payload: CreateCheckpointPayload = {}) {
  return requestJson<DbmsCheckpointRecord>("/dbms/checkpoint/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function recoverDbmsTransaction(_employeeId: number | undefined, txnId: number) {
  return requestJson<DbmsTransactionRecord>(`/dbms/recovery/${txnId}`, {
    method: "POST",
  });
}

export function getDbmsCaseReports(_employeeId?: number) {
  return requestJson<DbmsCaseReportRecord[]>("/dbms/reports/cases");
}

export function getDbmsEmployeeReports(_employeeId?: number) {
  return requestJson<DbmsEmployeeReportRecord[]>("/dbms/reports/employees");
}

export function getDbmsTicketReports(_employeeId?: number) {
  return requestJson<DbmsTicketReportRecord[]>("/dbms/reports/tickets");
}

export function getAccessDashboard() {
  return requestJson<AccessDashboardResponse>("/access/dashboard");
}

export function updateCaseAccess(payload: UpdateCaseAccessPayload) {
  return requestJson<Record<string, string | number | boolean | null>>("/access/case-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadDocument(
  caseId: number,
  file: File,
  _uploadedBy?: number,
  confidentialityLevel = "Internal",
): Promise<UploadResponse> {
  try {
    // 1. Request S3 Pre-Signed Upload PUT URL
    const presign = await requestJson<PresignUploadResponse>("/documents/presign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        confidentiality_level: confidentialityLevel,
      }),
    });

    // 2. Direct upload to S3/MinIO via Pre-Signed URL
    const uploadHeaders: Record<string, string> = {
      "Content-Type": file.type || "application/octet-stream",
      ...(presign.headers || {}),
    };

    const s3Resp = await fetch(presign.upload_url, {
      method: presign.method || "PUT",
      headers: uploadHeaders,
      body: file,
    });

    if (!s3Resp.ok) {
      throw new Error(`S3 direct upload failed with status ${s3Resp.status}`);
    }

    // 3. Confirm S3 upload with backend to register document and trigger OCR
    const confirmed = await requestJson<{
      document_id: number;
      case_id: number;
      file_name: string;
      s3_key: string;
      message: string;
    }>("/documents/confirm-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        file_name: file.name,
        s3_key: presign.s3_key,
        confidentiality_level: confidentialityLevel,
        file_size_bytes: file.size,
      }),
    });

    return {
      message: "Uploaded to S3",
      document_id: confirmed.document_id,
      file_name: file.name,
      file_path: presign.s3_key,
      file_url: `/documents/${confirmed.document_id}/download`,
    };
  } catch (_err) {
    // Resilient fallback to multipart upload if S3 direct upload fails
    const formData = new FormData();
    formData.append("file", file);

    const searchParams = new URLSearchParams({
      case_id: String(caseId),
      confidentiality_level: confidentialityLevel,
    });

    return requestJson<UploadResponse>("/upload-document/", {
      method: "POST",
      body: formData,
    }, searchParams);
  }
}

export function searchDocuments(query: string, caseId?: number) {
  const params = new URLSearchParams({ q: query });
  if (caseId) params.set("case_id", String(caseId));
  return requestJson<SearchResults>("/documents/search", {}, params);
}

export function setCaseLegalHold(caseId: number, legalHold: boolean, reason?: string) {
  return requestJson<LegalHoldRecord>(`/cases/${caseId}/legal-hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legal_hold: legalHold, reason }),
  });
}

export function getCaseLegalHold(caseId: number) {
  return requestJson<LegalHoldRecord>(`/cases/${caseId}/legal-hold`);
}

export function deleteDocument(documentId: number) {
  return requestJson<{ message: string; document_id: number }>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function closeCase(caseId: number, _employeeId?: number) {
  return requestJson<CaseDetailRecord>(
    `/cases/${caseId}/close`,
    { method: "POST" },
  );
}

// --------------------------------------------------------------------------
// Phase 4: Trust Accounting (IOLTA), LEDES 1998B, & Conflict Checking
// --------------------------------------------------------------------------

export interface TrustAccountRecord {
  account_id: number;
  account_number: string;
  account_name: string;
  account_type: "IOLTA_TRUST" | "OPERATING";
  bank_name: string;
  current_balance: number;
  version: number;
  transaction_count: number;
  created_at: string;
}

export interface ThreeWayReconciliationResponse {
  reconciliation_id: number;
  account_id: number;
  account_name: string;
  statement_date: string;
  bank_statement_balance: number;
  general_ledger_balance: number;
  client_ledger_balance: number;
  variance: number;
  status: "BALANCED" | "DISCREPANCY";
  is_balanced: boolean;
  client_count: number;
  client_breakdown: Array<{
    client_id: number;
    client_name: string;
    trust_balance: number;
  }>;
  reconciled_at: string;
  notes: string | null;
}

export interface ClientTrustSummaryResponse {
  client_id: number;
  client_name: string;
  trust_balance: number;
  transaction_count: number;
  transactions: Array<{
    transaction_id: number;
    type: string;
    amount: number;
    client_running_balance: number;
    payee_or_payor: string;
    reference_number: string | null;
    description: string | null;
    created_at: string;
  }>;
}

export interface LedesInvoiceResponse {
  bill_id: number;
  invoice_number: string;
  file_name: string;
  total_amount: number;
  line_item_count: number;
  is_valid: boolean;
  validation_errors: string[];
  file_content: string;
}

export interface UtbmsReferenceResponse {
  task_codes: Array<{ code: string; description: string }>;
  activity_codes: Array<{ code: string; description: string }>;
  expense_codes: Array<{ code: string; description: string }>;
}

export interface ConflictMatch {
  match_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ETHICAL_WALL_REQUIRED" | "LOW";
  matched_name: string;
  organization?: string | null;
  entity_type: string;
  client_id?: number;
  case_id?: number;
  case_title?: string;
  case_status?: string;
  attorney_name?: string;
  description: string;
}

export interface ConflictCheckResponse {
  query: string;
  search_terms: string[];
  status: "CLEARED" | "CONFLICT_DETECTED" | "REQUIRES_ETHICAL_WALL" | "REVIEW_RECOMMENDED";
  risk_level: "CLEARED" | "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  risk_score: number;
  match_count: number;
  matches: ConflictMatch[];
  ethical_rule: string;
  ethical_wall_required: boolean;
  recommendation: string;
  checked_at: string;
}

export interface AdversePartyRecord {
  party_id: number;
  case_id: number;
  party_name: string;
  party_type: string;
  corporate_affiliate: string | null;
  added_at: string;
}

export function getTrustAccounts() {
  return requestJson<TrustAccountRecord[]>("/trust/accounts");
}

export function depositTrustFunds(payload: {
  account_id: number;
  client_id: number;
  amount: number;
  payee_or_payor: string;
  case_id?: number;
  reference_number?: string;
  description?: string;
}) {
  return requestJson<{
    transaction_id: number;
    account_id: number;
    client_id: number;
    amount: number;
    account_running_balance: number;
    client_running_balance: number;
    message: string;
  }>("/trust/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function disburseTrustFunds(payload: {
  account_id: number;
  client_id: number;
  amount: number;
  payee_or_payor: string;
  case_id?: number;
  reference_number?: string;
  description?: string;
}) {
  return requestJson<{
    transaction_id: number;
    amount: number;
    account_running_balance: number;
    client_running_balance: number;
    message: string;
  }>("/trust/disburse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function transferEarnedFee(payload: {
  iolta_account_id: number;
  operating_account_id: number;
  client_id: number;
  amount: number;
  case_id?: number;
  reference_number?: string;
  invoice_number?: string;
}) {
  return requestJson<{
    message: string;
    amount: number;
    iolta_balance: number;
    operating_balance: number;
    client_remaining_trust: number;
    transfer_reference: string;
  }>("/trust/transfer-earned-fee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function executeThreeWayReconciliation(payload: {
  account_id: number;
  statement_date: string;
  bank_statement_balance: number;
  notes?: string;
}) {
  return requestJson<ThreeWayReconciliationResponse>("/trust/reconciliation/three-way", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getClientTrustSummary(clientId: number) {
  return requestJson<ClientTrustSummaryResponse>(`/trust/clients/${clientId}`);
}

export function getLedesInvoice(billId: number) {
  return requestJson<LedesInvoiceResponse>(`/billing/${billId}/ledes`);
}

export function getLedesDownloadUrl(billId: number) {
  return `${API_BASE_URL}/billing/${billId}/ledes/download`;
}

export function getUtbmsCodes() {
  return requestJson<UtbmsReferenceResponse>("/billing/utbms-codes");
}

export function checkConflict(payload: {
  query: string;
  target_matter_type?: string;
  proposed_client_name?: string;
  proposed_adverse_party?: string;
}) {
  return requestJson<ConflictCheckResponse>("/conflicts/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function addCaseAdverseParty(caseId: number, payload: {
  party_name: string;
  party_type?: string;
  corporate_affiliate?: string;
}) {
  return requestJson<{
    party_id: number;
    case_id: number;
    party_name: string;
    message: string;
  }>(`/conflicts/cases/${caseId}/adverse-parties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getCaseAdverseParties(caseId: number) {
  return requestJson<AdversePartyRecord[]>(`/conflicts/cases/${caseId}/adverse-parties`);
}

export interface SystemTelemetryResponse {
  status: string;
  cache: {
    backend: string;
    redis_connected: boolean;
    hits: number;
    misses: number;
    total_queries: number;
    hit_ratio_percent: number;
    keys_in_memory: number;
  };
  metrics: {
    uptime_seconds: number;
    total_requests: number;
    status_2xx: number;
    status_4xx: number;
    status_5xx: number;
    slow_requests_gt_1s: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
  };
}

export function getSystemTelemetry() {
  return requestJson<SystemTelemetryResponse>("/system/telemetry");
}

export function clearSystemCache() {
  return requestJson<{ message: string; status: string }>("/system/cache/clear", {
    method: "POST",
  });
}

