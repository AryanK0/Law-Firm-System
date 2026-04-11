import type { VercelRequest, VercelResponse } from "@vercel/node";

export type ApiRequest = VercelRequest;
export type ApiResponse = VercelResponse;

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export function allowMethods(
  req: ApiRequest,
  res: ApiResponse,
  methods: string[],
) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", methods);
    res.status(204).end();
    return false;
  }

  if (!req.method || !methods.includes(req.method)) {
    res.setHeader("Allow", methods);
    throw new ApiError(405, `Method ${req.method ?? "UNKNOWN"} not allowed.`);
  }

  return true;
}

export function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getTrimmedQueryValue(value: string | string[] | undefined) {
  const resolved = getSingleQueryValue(value)?.trim();
  return resolved ? resolved : undefined;
}

export function getNumberQueryValue(
  value: string | string[] | undefined,
  label: string,
) {
  const raw = getSingleQueryValue(value);
  if (raw === undefined || raw === "") {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }

  return parsed;
}

export function parseRouteId(
  value: string | string[] | undefined,
  label = "id",
) {
  const parsed = getNumberQueryValue(value, label);
  if (typeof parsed !== "number") {
    throw new ApiError(400, `Missing ${label}.`);
  }

  return parsed;
}

export function readBody<T>(req: ApiRequest) {
  return (req.body ?? {}) as T;
}

function databaseFailureDetail(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code =
    "code" in error && typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  if (code === "ECONNREFUSED") {
    return "Cannot reach MySQL (connection refused). On Windows use DB_HOST=127.0.0.1 if localhost fails; ensure the server is running and DB_PORT is correct.";
  }

  if (code === "ETIMEDOUT" || code === "ENOTFOUND") {
    return "Cannot reach MySQL (timeout or host not found). Check DB_HOST and network; hosted databases often require DB_SSL=true.";
  }

  if (code === "ER_ACCESS_DENIED_ERROR") {
    return "MySQL access denied. Check DB_USER and DB_PASSWORD (and that the user may connect from this host).";
  }

  if (code === "ER_BAD_DB_ERROR") {
    return "MySQL database missing. Create the schema (backend/sql/schema.sql) and set DB_NAME, or fix the database name.";
  }

  if (code === "ER_NOT_SUPPORTED_AUTH_MODE") {
    return "MySQL auth plugin mismatch (e.g. caching_sha2). Use a MySQL 8 user, or set the user plugin to mysql_native_password for older clients.";
  }

  if (code === "HANDSHAKE_NO_SSL_SUPPORT" || code === "SSL_REQUIRED") {
    return "MySQL requires SSL. Set DB_SSL=true in environment variables.";
  }

  const message = error instanceof Error ? error.message : "";
  if (/ssl|TLS|certificate/i.test(message) && /mysql|connection/i.test(message)) {
    return "MySQL SSL/TLS error. Try DB_SSL=true; for self-signed certs set DB_SSL_INSECURE=true (dev only).";
  }

  return null;
}

export function handleApiError(res: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ detail: error.message });
  }

  const dbDetail = databaseFailureDetail(error);
  if (dbDetail) {
    return res.status(503).json({ detail: dbDetail });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return res.status(500).json({ detail: message });
}
