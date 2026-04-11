import { execute, queryOne, queryRows } from "./db";
import { ApiError } from "./http";

interface CreateTicketPayload {
  raised_by: number;
  description: string;
  priority?: string;
  status?: string;
  assigned_to?: number;
  resolution_deadline?: string;
}

async function fetchTicket(ticketId: number) {
  return queryOne<Record<string, unknown>>(
    `
    SELECT
      t.ticket_id,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.resolution_deadline,
      t.resolved_at,
      t.breach_flag,
      t.assigned_to,
      raised_by.name AS raised_by_name,
      assigned_to.name AS assigned_to_name
    FROM Ticket t
    LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
    LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
    WHERE t.ticket_id = ?
    `,
    [ticketId],
  );
}

export async function listTickets(filters: {
  status?: string;
  priority?: string;
  search?: string;
} = {}) {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters.priority) {
    conditions.push("t.priority = ?");
    params.push(filters.priority);
  }

  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(`
      (
        COALESCE(t.description, '') LIKE ?
        OR COALESCE(raised_by.name, '') LIKE ?
        OR COALESCE(assigned_to.name, '') LIKE ?
      )
    `);
    params.push(like, like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return queryRows(
    `
    SELECT
      t.ticket_id,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.resolution_deadline,
      t.resolved_at,
      t.breach_flag,
      raised_by.name AS raised_by_name,
      assigned_to.name AS assigned_to_name
    FROM Ticket t
    LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
    LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
    ${whereClause}
    ORDER BY t.created_at DESC, t.ticket_id DESC
    `,
    params,
  );
}

export async function createTicket(payload: CreateTicketPayload) {
  if (!payload.description.trim()) {
    throw new ApiError(400, "Ticket description is required.");
  }

  const result = await execute(
    `
    INSERT INTO Ticket(
      raised_by,
      description,
      priority,
      status,
      assigned_to,
      resolution_deadline
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      payload.raised_by,
      payload.description.trim(),
      payload.priority ?? "Medium",
      payload.status ?? "Open",
      payload.assigned_to ?? null,
      payload.resolution_deadline ?? null,
    ],
  );

  const created = await fetchTicket(result.insertId);
  if (!created) {
    throw new ApiError(400, "Ticket creation failed.");
  }

  return created;
}

export async function resolveTicket(ticketId: number, employeeId: number) {
  const ticket = await queryOne<Record<string, unknown>>(
    `
    SELECT ticket_id, assigned_to, status
    FROM Ticket
    WHERE ticket_id = ?
    `,
    [ticketId],
  );

  if (!ticket) {
    throw new ApiError(404, "Ticket not found.");
  }

  const resolver = await queryOne<Record<string, unknown>>(
    `
    SELECT e.employee_id, r.role_name, r.hierarchy_level
    FROM Employee e
    INNER JOIN Role r ON e.role_id = r.role_id
    WHERE e.employee_id = ?
    `,
    [employeeId],
  );

  if (!resolver) {
    throw new ApiError(404, "Resolver not found.");
  }

  const canResolve =
    resolver.role_name === "IT" ||
    Number(resolver.hierarchy_level ?? 99) <= 2 ||
    Number(ticket.assigned_to ?? -1) === employeeId;

  if (!canResolve) {
    throw new ApiError(403, "You cannot resolve this ticket.");
  }

  if (ticket.status !== "Resolved") {
    await execute(
      `
      UPDATE Ticket
      SET status = 'Resolved',
          resolved_at = NOW()
      WHERE ticket_id = ?
      `,
      [ticketId],
    );
  }

  const resolved = await fetchTicket(ticketId);
  if (!resolved) {
    throw new ApiError(404, "Ticket not found.");
  }

  return resolved;
}
