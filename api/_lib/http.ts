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

export function handleApiError(res: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ detail: error.message });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return res.status(500).json({ detail: message });
}
