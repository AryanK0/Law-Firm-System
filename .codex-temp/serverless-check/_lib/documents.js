"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDocuments = listDocuments;
exports.listCaseDocuments = listCaseDocuments;
exports.createDocumentRecord = createDocumentRecord;
const db_1 = require("./db");
function fileUrlSql(alias) {
    return `
    CASE
      WHEN ${alias}.file_path LIKE 'http%' THEN ${alias}.file_path
      ELSE CONCAT('/', TRIM(LEADING '/' FROM ${alias}.file_path))
    END
  `;
}
async function listDocuments(filters = {}) {
    const params = [];
    const conditions = [];
    if (typeof filters.employeeId === "number") {
        conditions.push("check_access(?, d.case_id) = TRUE");
        params.push(filters.employeeId);
    }
    if (typeof filters.caseId === "number") {
        conditions.push("d.case_id = ?");
        params.push(filters.caseId);
    }
    if (filters.search) {
        const like = `%${filters.search}%`;
        conditions.push(`
      (
        COALESCE(d.file_path, '') LIKE ?
        OR COALESCE(c.case_code, '') LIKE ?
        OR COALESCE(c.title, '') LIKE ?
        OR COALESCE(uploader.name, '') LIKE ?
      )
    `);
        params.push(like, like, like, like);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return (0, db_1.queryRows)(`
    SELECT
      d.document_id,
      d.case_id,
      d.uploaded_by,
      d.confidentiality_level,
      d.file_path,
      ${fileUrlSql("d")} AS file_url,
      SUBSTRING_INDEX(d.file_path, '/', -1) AS file_name,
      d.created_at,
      COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
      c.title AS case_title,
      uploader.name AS uploaded_by_name,
      COALESCE(version_data.latest_version, 1) AS latest_version,
      COALESCE(version_data.version_count, 1) AS version_count,
      version_data.last_modified_at
    FROM Document d
    LEFT JOIN Cases c ON d.case_id = c.case_id
    LEFT JOIN Employee uploader ON d.uploaded_by = uploader.employee_id
    LEFT JOIN (
      SELECT
        document_id,
        MAX(version_number) AS latest_version,
        COUNT(*) + 1 AS version_count,
        MAX(modified_at) AS last_modified_at
      FROM Document_Version
      GROUP BY document_id
    ) version_data ON version_data.document_id = d.document_id
    ${whereClause}
    ORDER BY d.created_at DESC, d.document_id DESC
    `, params);
}
async function listCaseDocuments(caseId) {
    const documents = await listDocuments({ caseId });
    return { case_id: caseId, documents };
}
async function createDocumentRecord(input) {
    const result = await (0, db_1.execute)(`
    INSERT INTO Document(case_id, uploaded_by, confidentiality_level, file_path)
    VALUES (?, ?, ?, ?)
    `, [
        input.caseId,
        input.uploadedBy ?? null,
        input.confidentialityLevel,
        input.filePath,
    ]);
    return {
        message: "Uploaded",
        document_id: result.insertId,
        file_name: input.filePath.split("/").pop() ?? "document",
        file_path: input.filePath,
        file_url: input.filePath.startsWith("http")
            ? input.filePath
            : `/${input.filePath.replace(/^\/+/, "")}`,
    };
}
