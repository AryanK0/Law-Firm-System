"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTickets = listTickets;
exports.createTicket = createTicket;
exports.resolveTicket = resolveTicket;
const db_1 = require("./db");
const http_1 = require("./http");
async function fetchTicket(ticketId) {
    return (0, db_1.queryOne)(`
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
    `, [ticketId]);
}
async function listTickets(filters = {}) {
    const params = [];
    const conditions = [];
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
    return (0, db_1.queryRows)(`
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
    `, params);
}
async function createTicket(payload) {
    if (!payload.description.trim()) {
        throw new http_1.ApiError(400, "Ticket description is required.");
    }
    const result = await (0, db_1.execute)(`
    INSERT INTO Ticket(
      raised_by,
      description,
      priority,
      status,
      assigned_to,
      resolution_deadline
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `, [
        payload.raised_by,
        payload.description.trim(),
        payload.priority ?? "Medium",
        payload.status ?? "Open",
        payload.assigned_to ?? null,
        payload.resolution_deadline ?? null,
    ]);
    const created = await fetchTicket(result.insertId);
    if (!created) {
        throw new http_1.ApiError(400, "Ticket creation failed.");
    }
    return created;
}
async function resolveTicket(ticketId, employeeId) {
    const ticket = await (0, db_1.queryOne)(`
    SELECT ticket_id, assigned_to, status
    FROM Ticket
    WHERE ticket_id = ?
    `, [ticketId]);
    if (!ticket) {
        throw new http_1.ApiError(404, "Ticket not found.");
    }
    const resolver = await (0, db_1.queryOne)(`
    SELECT e.employee_id, r.role_name, r.hierarchy_level
    FROM Employee e
    INNER JOIN Role r ON e.role_id = r.role_id
    WHERE e.employee_id = ?
    `, [employeeId]);
    if (!resolver) {
        throw new http_1.ApiError(404, "Resolver not found.");
    }
    const canResolve = resolver.role_name === "IT" ||
        Number(resolver.hierarchy_level ?? 99) <= 2 ||
        Number(ticket.assigned_to ?? -1) === employeeId;
    if (!canResolve) {
        throw new http_1.ApiError(403, "You cannot resolve this ticket.");
    }
    if (ticket.status !== "Resolved") {
        await (0, db_1.execute)(`
      UPDATE Ticket
      SET status = 'Resolved',
          resolved_at = NOW()
      WHERE ticket_id = ?
      `, [ticketId]);
    }
    const resolved = await fetchTicket(ticketId);
    if (!resolved) {
        throw new http_1.ApiError(404, "Ticket not found.");
    }
    return resolved;
}
