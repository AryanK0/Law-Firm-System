"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClients = listClients;
exports.createClient = createClient;
const db_1 = require("./db");
const http_1 = require("./http");
async function listClients(search) {
    const params = [];
    const conditions = [];
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
    return (0, db_1.queryRows)(`
    SELECT client_id, name, organization, contact_info
    FROM Client
    ${whereClause}
    ORDER BY organization, name, client_id
    `, params);
}
async function createClient(payload) {
    if (!(payload.name?.trim() || payload.organization?.trim())) {
        throw new http_1.ApiError(400, "Provide either a client name or organization.");
    }
    const result = await (0, db_1.execute)(`
    INSERT INTO Client(name, contact_info, organization)
    VALUES (?, ?, ?)
    `, [
        payload.name?.trim() || null,
        payload.contact_info?.trim() || null,
        payload.organization?.trim() || null,
    ]);
    return (0, db_1.queryOne)(`
    SELECT client_id, name, organization, contact_info
    FROM Client
    WHERE client_id = ?
    `, [result.insertId]);
}
