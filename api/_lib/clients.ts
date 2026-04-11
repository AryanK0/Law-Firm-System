import { execute, queryOne, queryRows } from "./db";
import { ApiError } from "./http";

interface CreateClientPayload {
  name?: string;
  organization?: string;
  contact_info?: string;
}

export async function listClients(search?: string) {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(`
      (
        COALESCE(name, '') LIKE ?
        OR COALESCE(organization, '') LIKE ?
        OR COALESCE(contact_info, '') LIKE ?
      )
    `);
    params.push(like, like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return queryRows(
    `
    SELECT client_id, name, organization, contact_info
    FROM Client
    ${whereClause}
    ORDER BY organization, name, client_id
    `,
    params,
  );
}

export async function createClient(payload: CreateClientPayload) {
  if (!(payload.name?.trim() || payload.organization?.trim())) {
    throw new ApiError(400, "Provide either a client name or organization.");
  }

  const result = await execute(
    `
    INSERT INTO Client(name, contact_info, organization)
    VALUES (?, ?, ?)
    `,
    [
      payload.name?.trim() || null,
      payload.contact_info?.trim() || null,
      payload.organization?.trim() || null,
    ],
  );

  return queryOne(
    `
    SELECT client_id, name, organization, contact_info
    FROM Client
    WHERE client_id = ?
    `,
    [result.insertId],
  );
}
