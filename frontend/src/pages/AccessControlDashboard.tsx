import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRound, Save, ShieldCheck, UserCheck, Workflow } from "lucide-react";

import { useAuth } from "../content/AuthContext";
import {
  getAccessDashboard,
  getCases,
  getEmployees,
  updateCaseAccess,
  type AccessDashboardResponse,
  type CaseRecord,
  type EmployeeRecord,
} from "../services/api";

const emptyDashboard: AccessDashboardResponse = {
  hierarchy: [],
  permissions: [],
  matrix: [],
  case_access: [],
  clearances: [],
  violations: [],
  delegations: [],
  requests: [],
};

type GrantKey =
  | "can_view"
  | "can_edit"
  | "can_upload_docs"
  | "can_approve_docs"
  | "can_close_case"
  | "can_assign_members";

type AccessFormState = {
  employeeId: string;
  caseId: string;
  caseRole: string;
} & Record<GrantKey, boolean>;

const defaultAccessForm: AccessFormState = {
  employeeId: "",
  caseId: "",
  caseRole: "Managed access",
  can_view: true,
  can_edit: false,
  can_upload_docs: false,
  can_approve_docs: false,
  can_close_case: false,
  can_assign_members: false,
};

const accessToggles: Array<{ key: GrantKey; label: string }> = [
  { key: "can_view", label: "View matter" },
  { key: "can_edit", label: "Edit matter" },
  { key: "can_upload_docs", label: "Upload documents" },
  { key: "can_approve_docs", label: "Approve documents" },
  { key: "can_assign_members", label: "Assign members" },
  { key: "can_close_case", label: "Close matter" },
];

const columnLabels: Record<string, string> = {
  rank_no: "rank",
  can_assign_case: "can assign matters",
  can_approve_billing: "can approve billing",
  can_override_access: "can override access",
  can_run_recovery: "can resolve activity",
  can_upload_docs: "can upload documents",
  can_approve_docs: "can approve documents",
  can_assign_members: "can assign members",
};

const permissionLabels: Record<string, string> = {
  VIEW_CASE: "View matters",
  EDIT_CASE: "Edit matters",
  ASSIGN_CASE: "Assign matters",
  VIEW_TEAM: "View teams",
  MODIFY_TEAM: "Modify teams",
  VIEW_DOCUMENT: "View documents",
  UPLOAD_DOCUMENT: "Upload documents",
  DELETE_DOCUMENT: "Delete documents",
  VIEW_BILLING: "View billing",
  APPROVE_BILLING: "Approve billing",
  VIEW_REPORTS: "View reports",
  VIEW_LOCKS: "View protected records",
  CREATE_CHECKPOINT: "Create continuity snapshots",
  RUN_RECOVERY: "Resolve interrupted activity",
  ACCESS_AUDIT_LOG: "View access audit",
  UPDATE_STATUS: "Update matter status",
  ASSIGN_HEARING: "Assign hearing dates",
  CLOSE_CASE: "Close matters",
  OVERRIDE_ACCESS: "Override access",
};

function isBooleanColumn(column: string) {
  return column === "allowed" || column.startsWith("can_") || column.endsWith("_flag");
}

function coerceBoolean(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "TRUE";
}

function valueText(value: unknown, column: string) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (column === "permission_name" || column === "requested_permission") {
    const raw = String(value);
    return permissionLabels[raw] ?? raw.replace(/_/g, " ");
  }

  if (isBooleanColumn(column) || typeof value === "boolean") {
    return coerceBoolean(value) ? "Yes" : "No";
  }

  return String(value);
}

function columnText(column: string) {
  return columnLabels[column] ?? column.replace(/_/g, " ");
}

function DataTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
}) {
  return (
    <section className="card-premium p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
          {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-3">
                  {columnText(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.slice(0, 12).map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column} className="max-w-[260px] px-3 py-3 text-slate-300">
                    <span>{valueText(row[column], column)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
          No rows available.
        </p>
      ) : null}
    </section>
  );
}

export default function AccessControlDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AccessDashboardResponse>(emptyDashboard);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [accessForm, setAccessForm] = useState<AccessFormState>(defaultAccessForm);
  const [selectedGrantId, setSelectedGrantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManagingPartner = user.role === "Managing Partner";

  const loadDashboard = useCallback(async () => {
    const data = await getAccessDashboard();
    setDashboard(data);
    setError(null);
    return data;
  }, []);

  useEffect(() => {
    loadDashboard()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    if (!isManagingPartner) {
      setEmployees([]);
      setCases([]);
      setSelectedGrantId("");
      setAccessForm(defaultAccessForm);
      return;
    }

    let active = true;
    setLoadingOptions(true);

    Promise.all([getEmployees(), getCases(user.id)])
      .then(([employeeData, caseData]) => {
        if (!active) {
          return;
        }

        const activeEmployees = employeeData.filter((employee) => employee.status === "Active");
        setEmployees(activeEmployees);
        setCases(caseData);
        setAccessForm((current) => ({
          ...current,
          employeeId: current.employeeId || String(activeEmployees[0]?.employee_id ?? ""),
          caseId: current.caseId || String(caseData[0]?.case_id ?? ""),
        }));
      })
      .catch((err: Error) => setEditorMessage(err.message))
      .finally(() => {
        if (active) {
          setLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isManagingPartner, user.id]);

  const allowedCount = useMemo(
    () => dashboard.matrix.filter((row) => coerceBoolean(row.allowed)).length,
    [dashboard.matrix],
  );

  const stats = [
    { label: "Hierarchy levels", value: dashboard.hierarchy.length, icon: <Workflow size={18} /> },
    { label: "Allowed permissions", value: allowedCount, icon: <KeyRound size={18} /> },
    { label: "Case grants", value: dashboard.case_access.length, icon: <UserCheck size={18} /> },
    { label: "Violations", value: dashboard.violations.length, icon: <ShieldCheck size={18} /> },
  ];

  const handleGrantSelection = (grantId: string) => {
    setSelectedGrantId(grantId);

    if (!grantId) {
      return;
    }

    const grant = dashboard.case_access.find(
      (row) => String(row.case_access_id ?? "") === grantId,
    );

    if (!grant) {
      return;
    }

    setAccessForm({
      employeeId: String(grant.employee_id ?? ""),
      caseId: String(grant.case_id ?? ""),
      caseRole: String(grant.case_role ?? "Managed access"),
      can_view: coerceBoolean(grant.can_view),
      can_edit: coerceBoolean(grant.can_edit),
      can_upload_docs: coerceBoolean(grant.can_upload_docs),
      can_approve_docs: coerceBoolean(grant.can_approve_docs),
      can_close_case: coerceBoolean(grant.can_close_case),
      can_assign_members: coerceBoolean(grant.can_assign_members),
    });
  };

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isManagingPartner) {
      setEditorMessage("Only the Managing Partner can change access grants.");
      return;
    }

    const employeeId = Number(accessForm.employeeId);
    const caseId = Number(accessForm.caseId);

    if (!Number.isInteger(employeeId) || !Number.isInteger(caseId)) {
      setEditorMessage("Choose an employee and matter before saving.");
      return;
    }

    setSaving(true);
    setEditorMessage(null);

    try {
      await updateCaseAccess({
        approver_id: user.id,
        employee_id: employeeId,
        case_id: caseId,
        case_role: accessForm.caseRole.trim() || "Managed access",
        can_view: accessForm.can_view,
        can_edit: accessForm.can_edit,
        can_upload_docs: accessForm.can_upload_docs,
        can_approve_docs: accessForm.can_approve_docs,
        can_close_case: accessForm.can_close_case,
        can_assign_members: accessForm.can_assign_members,
      });
      await loadDashboard();
      setSelectedGrantId("");
      setEditorMessage("Case access updated.");
    } catch (err) {
      setEditorMessage(err instanceof Error ? err.message : "Access update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <section className="mb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          <ShieldCheck size={14} />
          Enterprise Access
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Hierarchy, clearance, delegation, and violation controls
        </h1>
      </section>

      {error ? <div className="mb-6 card-premium p-5 text-sm text-red-300">{error}</div> : null}

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="card-premium p-5">
            <span className="icon-accent inline-flex rounded-xl p-2">{item.icon}</span>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </section>

      {isManagingPartner ? (
        <section className="mb-8 card-premium p-6">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Managing Partner Tools</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Change Case Access
              </h2>
            </div>
            {editorMessage ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                {editorMessage}
              </span>
            ) : null}
          </div>

          <form onSubmit={handleAccessSubmit} className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <label className="xl:col-span-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Existing grant
              </span>
              <select
                value={selectedGrantId}
                onChange={(event) => handleGrantSelection(event.target.value)}
                className="page-select w-full"
              >
                <option value="">Create or select an existing grant</option>
                {dashboard.case_access.map((grant) => (
                  <option key={String(grant.case_access_id)} value={String(grant.case_access_id)}>
                    {String(grant.case_code ?? `Matter ${grant.case_id}`)} |{" "}
                    {String(grant.employee_name ?? `Employee ${grant.employee_id}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="xl:col-span-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Employee
              </span>
              <select
                value={accessForm.employeeId}
                onChange={(event) =>
                  setAccessForm((current) => ({ ...current, employeeId: event.target.value }))
                }
                className="page-select w-full"
                disabled={loadingOptions}
              >
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.name} | {employee.role_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="xl:col-span-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Matter
              </span>
              <select
                value={accessForm.caseId}
                onChange={(event) =>
                  setAccessForm((current) => ({ ...current, caseId: event.target.value }))
                }
                className="page-select w-full"
                disabled={loadingOptions}
              >
                {cases.map((caseItem) => (
                  <option key={caseItem.case_id} value={caseItem.case_id}>
                    {caseItem.case_code ?? `Matter ${caseItem.case_id}`} | {caseItem.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="xl:col-span-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Access label
              </span>
              <input
                value={accessForm.caseRole}
                onChange={(event) =>
                  setAccessForm((current) => ({ ...current, caseRole: event.target.value }))
                }
                className="page-input"
                placeholder="Managed access"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-8 xl:grid-cols-3">
              {accessToggles.map((item) => (
                <label
                  key={item.key}
                  className="flex min-h-[52px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={accessForm[item.key]}
                    onChange={(event) =>
                      setAccessForm((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-cyan-300"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <div className="xl:col-span-12">
              <button
                type="submit"
                className="page-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving || loadingOptions || !accessForm.employeeId || !accessForm.caseId}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Access"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-8">
        <DataTable
          title="Hierarchy Matrix"
          rows={dashboard.hierarchy}
          columns={["title", "rank_no", "can_assign_case", "can_approve_billing", "can_override_access", "can_run_recovery"]}
        />
        <DataTable
          title="Permission Matrix"
          rows={dashboard.matrix}
          columns={["title", "permission_name", "allowed"]}
        />
        <DataTable
          title="Case Access Grants"
          rows={dashboard.case_access}
          columns={["case_code", "title", "employee_name", "case_role", "can_view", "can_edit", "can_upload_docs", "can_assign_members"]}
        />
        <DataTable
          title="Access Requests"
          rows={dashboard.requests}
          columns={["request_id", "requester_name", "resource_type", "resource_id", "requested_permission", "status", "approved_by_name"]}
        />
        <DataTable
          title="Delegated Access"
          rows={dashboard.delegations}
          columns={["delegation_id", "from_employee_name", "to_employee_name", "permission_name", "valid_from", "valid_to", "status"]}
        />
        <DataTable
          title="Violation Logs"
          rows={dashboard.violations}
          columns={["violation_id", "employee_name", "attempted_resource_type", "attempted_resource_id", "attempted_action", "severity", "reason"]}
        />
      </div>
    </div>
  );
}
