import { callProcedureOne, queryOne, queryRows } from "./db";
import { ApiError } from "./http";

const CASE_SUMMARY_SQL = `
SELECT
  c.case_id,
  c.case_code,
  c.title,
  c.description,
  c.case_type,
  c.client_id,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  c.lead_partner_id,
  lp.name AS lead_partner_name,
  c.lead_senior_id,
  ls.name AS lead_senior_name,
  c.status,
  c.confidentiality_level,
  c.created_by,
  creator.name AS created_by_name,
  c.start_date,
  c.end_date,
  COALESCE(team.team_size, 0) AS team_size,
  COALESCE(documents.document_count, 0) AS document_count,
  COALESCE(billing.total_amount, 0) AS billed_total,
  COALESCE(hours.total_hours, 0) AS total_hours
FROM Cases c
LEFT JOIN Client cl ON c.client_id = cl.client_id
LEFT JOIN Employee lp ON c.lead_partner_id = lp.employee_id
LEFT JOIN Employee ls ON c.lead_senior_id = ls.employee_id
LEFT JOIN Employee creator ON c.created_by = creator.employee_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS team_size
  FROM Case_Team
  GROUP BY case_id
) team ON team.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS document_count
  FROM Document
  GROUP BY case_id
) documents ON documents.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(amount), 0) AS total_amount
  FROM Billing
  GROUP BY case_id
) billing ON billing.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(hours), 0) AS total_hours
  FROM Time_Log
  GROUP BY case_id
) hours ON hours.case_id = c.case_id
`;

const CASE_DETAIL_SQL = `
SELECT
  c.case_id,
  c.case_code,
  c.title,
  c.description,
  c.case_type,
  c.status,
  c.confidentiality_level,
  c.start_date,
  c.end_date,
  c.created_by,
  creator.name AS created_by_name,
  c.client_id,
  cl.name AS client_contact_name,
  cl.organization AS client_organization,
  cl.contact_info AS client_contact_info,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  c.lead_partner_id,
  lp.name AS lead_partner_name,
  lp.email AS lead_partner_email,
  c.lead_senior_id,
  ls.name AS lead_senior_name,
  ls.email AS lead_senior_email,
  COALESCE(team.team_size, 0) AS team_size,
  COALESCE(documents.document_count, 0) AS document_count,
  COALESCE(billing.total_amount, 0) AS billed_total,
  COALESCE(hours.total_hours, 0) AS total_hours,
  hearing.hearing_id AS next_hearing_id,
  hearing.date AS next_hearing_date,
  hearing.notes AS next_hearing_notes,
  hearing.court_name AS next_hearing_court_name,
  hearing.location AS next_hearing_location
FROM Cases c
LEFT JOIN Client cl ON c.client_id = cl.client_id
LEFT JOIN Employee lp ON c.lead_partner_id = lp.employee_id
LEFT JOIN Employee ls ON c.lead_senior_id = ls.employee_id
LEFT JOIN Employee creator ON c.created_by = creator.employee_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS team_size
  FROM Case_Team
  GROUP BY case_id
) team ON team.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS document_count
  FROM Document
  GROUP BY case_id
) documents ON documents.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(amount), 0) AS total_amount
  FROM Billing
  GROUP BY case_id
) billing ON billing.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(hours), 0) AS total_hours
  FROM Time_Log
  GROUP BY case_id
) hours ON hours.case_id = c.case_id
LEFT JOIN (
  SELECT
    h.case_id,
    h.hearing_id,
    h.date,
    h.notes,
    court.name AS court_name,
    court.location
  FROM Hearing h
  INNER JOIN Court court ON h.court_id = court.court_id
  INNER JOIN (
    SELECT case_id, MIN(date) AS next_date
    FROM Hearing
    GROUP BY case_id
  ) next_hearing ON next_hearing.case_id = h.case_id AND next_hearing.next_date = h.date
) hearing ON hearing.case_id = c.case_id
`;

interface CreateCasePayload {
  case_code?: string;
  title: string;
  description?: string;
  case_type?: string;
  client_id: number;
  lead_partner_id?: number;
  lead_senior_id?: number;
  status?: string;
  confidentiality_level?: string;
  created_by?: number;
  start_date?: string;
  end_date?: string;
}

export async function checkCaseAccess(employeeId: number, caseId: number) {
  const access = await queryOne<{ has_access: number }>(
    "SELECT check_access(?, ?) AS has_access",
    [employeeId, caseId],
  );
  return Boolean(access?.has_access);
}

export async function ensureCaseExists(caseId: number) {
  const row = await queryOne<{ case_id: number }>(
    "SELECT case_id FROM Cases WHERE case_id = ?",
    [caseId],
  );

  if (!row) {
    throw new ApiError(404, "Case not found.");
  }
}

export async function ensureCaseAccess(employeeId: number, caseId: number) {
  await ensureCaseExists(caseId);

  if (!(await checkCaseAccess(employeeId, caseId))) {
    throw new ApiError(403, "You do not have access to this case.");
  }
}

export async function listCases(
  employeeId: number,
  filters: { status?: string; search?: string } = {},
) {
  const params: unknown[] = [employeeId];
  const conditions = ["check_access(?, c.case_id) = TRUE"];

  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }

  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(`
      (
        COALESCE(c.title, '') LIKE ?
        OR COALESCE(c.description, '') LIKE ?
        OR COALESCE(c.case_code, '') LIKE ?
        OR COALESCE(cl.organization, '') LIKE ?
        OR COALESCE(cl.name, '') LIKE ?
      )
    `);
    params.push(like, like, like, like, like);
  }

  return queryRows(
    `${CASE_SUMMARY_SQL}
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.case_id DESC`,
    params,
  );
}

export async function getCaseDetail(caseId: number) {
  const row = await queryOne<Record<string, unknown>>(
    `${CASE_DETAIL_SQL} WHERE c.case_id = ?`,
    [caseId],
  );

  if (!row) {
    throw new ApiError(404, "Case not found.");
  }

  const hearings = await queryRows(
    `
    SELECT
      h.hearing_id,
      h.date,
      h.notes,
      h.case_id,
      COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
      c.title,
      court.name AS court_name,
      court.location,
      court.jurisdiction_type
    FROM Hearing h
    INNER JOIN Cases c ON h.case_id = c.case_id
    LEFT JOIN Court court ON h.court_id = court.court_id
    WHERE h.case_id = ?
    ORDER BY h.date, h.hearing_id
    `,
    [caseId],
  );

  return {
    case_id: row.case_id,
    case_code: row.case_code,
    title: row.title,
    description: row.description,
    case_type: row.case_type,
    status: row.status,
    confidentiality_level: row.confidentiality_level,
    start_date: row.start_date,
    end_date: row.end_date,
    created_by: {
      employee_id: row.created_by,
      name: row.created_by_name,
    },
    client: {
      client_id: row.client_id,
      name: row.client_contact_name,
      organization: row.client_organization,
      contact_info: row.client_contact_info,
      display_name: row.client_name,
    },
    lead_partner: {
      employee_id: row.lead_partner_id,
      name: row.lead_partner_name,
      email: row.lead_partner_email,
    },
    lead_senior: {
      employee_id: row.lead_senior_id,
      name: row.lead_senior_name,
      email: row.lead_senior_email,
    },
    metrics: {
      team_size: Number(row.team_size ?? 0),
      document_count: Number(row.document_count ?? 0),
      billed_total: Number(row.billed_total ?? 0),
      total_hours: Number(row.total_hours ?? 0),
    },
    next_hearing: row.next_hearing_id
      ? {
          hearing_id: row.next_hearing_id,
          date: row.next_hearing_date,
          notes: row.next_hearing_notes,
          court_name: row.next_hearing_court_name,
          location: row.next_hearing_location,
        }
      : null,
    hearings,
  };
}

export async function getCaseTeam(caseId: number) {
  const team = await queryRows(
    `
    SELECT
      ct.employee_id,
      ct.role_in_case,
      ct.assigned_by,
      assigned_by_employee.name AS assigned_by_name,
      e.name,
      e.email,
      e.phone,
      e.status,
      e.employment_type,
      d.department_name,
      r.role_name,
      r.hierarchy_level
    FROM Case_Team ct
    INNER JOIN Employee e ON ct.employee_id = e.employee_id
    LEFT JOIN Employee assigned_by_employee ON ct.assigned_by = assigned_by_employee.employee_id
    LEFT JOIN Department d ON e.department_id = d.department_id
    LEFT JOIN Role r ON e.role_id = r.role_id
    WHERE ct.case_id = ?
    ORDER BY
      CASE ct.role_in_case
        WHEN 'Lead Partner' THEN 1
        WHEN 'Lead Senior' THEN 2
        ELSE 3
      END,
      r.hierarchy_level,
      e.name
    `,
    [caseId],
  );

  return { case_id: caseId, team };
}

export async function getCaseStatusHistory(caseId: number) {
  const history = await queryRows(
    `
    SELECT
      h.history_id,
      h.old_status,
      h.new_status,
      h.changed_by,
      e.name AS changed_by_name,
      h.timestamp
    FROM Case_Status_History h
    LEFT JOIN Employee e ON h.changed_by = e.employee_id
    WHERE h.case_id = ?
    ORDER BY h.timestamp DESC, h.history_id DESC
    `,
    [caseId],
  );

  return { case_id: caseId, history };
}

export async function getCaseBilling(caseId: number) {
  const entries = await queryRows(
    `
    SELECT
      b.bill_id,
      b.amount,
      b.status,
      b.generated_by,
      generator.name AS generated_by_name,
      b.approved_by,
      approver.name AS approved_by_name
    FROM Billing b
    LEFT JOIN Employee generator ON b.generated_by = generator.employee_id
    LEFT JOIN Employee approver ON b.approved_by = approver.employee_id
    WHERE b.case_id = ?
    ORDER BY b.bill_id DESC
    `,
    [caseId],
  );

  const summary = await queryOne<Record<string, unknown>>(
    `
    SELECT
      COUNT(*) AS bill_count,
      COALESCE(SUM(amount), 0) AS total_amount,
      COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) AS approved_amount,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) AS pending_amount
    FROM Billing
    WHERE case_id = ?
    `,
    [caseId],
  );

  const hours = await queryOne<Record<string, unknown>>(
    `
    SELECT
      COALESCE(SUM(hours), 0) AS total_hours,
      COUNT(*) AS log_count
    FROM Time_Log
    WHERE case_id = ?
    `,
    [caseId],
  );

  return {
    case_id: caseId,
    summary: {
      bill_count: Number(summary?.bill_count ?? 0),
      total_amount: Number(summary?.total_amount ?? 0),
      approved_amount: Number(summary?.approved_amount ?? 0),
      pending_amount: Number(summary?.pending_amount ?? 0),
      total_hours: Number(hours?.total_hours ?? 0),
      time_log_count: Number(hours?.log_count ?? 0),
    },
    entries: entries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount ?? 0),
    })),
  };
}

export async function createCase(payload: CreateCasePayload) {
  const created = await callProcedureOne<{ case_id: number }>("create_case_full", [
    payload.case_code ?? null,
    payload.title,
    payload.description ?? null,
    payload.case_type ?? null,
    payload.client_id,
    payload.lead_partner_id ?? null,
    payload.lead_senior_id ?? null,
    payload.status ?? "Open",
    payload.confidentiality_level ?? "Internal",
    payload.created_by ?? null,
    payload.start_date ?? null,
    payload.end_date ?? null,
  ]);

  if (!created?.case_id) {
    throw new ApiError(400, "Case creation did not return a new id.");
  }

  return getCaseDetail(created.case_id);
}
