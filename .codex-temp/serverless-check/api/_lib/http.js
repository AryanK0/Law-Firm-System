"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.allowMethods = allowMethods;
exports.getSingleQueryValue = getSingleQueryValue;
exports.getTrimmedQueryValue = getTrimmedQueryValue;
exports.getNumberQueryValue = getNumberQueryValue;
exports.parseRouteId = parseRouteId;
exports.readBody = readBody;
exports.handleApiError = handleApiError;
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
exports.ApiError = ApiError;
function allowMethods(req, res, methods) {
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
function getSingleQueryValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
function getTrimmedQueryValue(value) {
    const resolved = getSingleQueryValue(value)?.trim();
    return resolved ? resolved : undefined;
}
function getNumberQueryValue(value, label) {
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
function parseRouteId(value, label = "id") {
    const parsed = getNumberQueryValue(value, label);
    if (typeof parsed !== "number") {
        throw new ApiError(400, `Missing ${label}.`);
    }
    return parsed;
}
function readBody(req) {
    return (req.body ?? {});
}
function handleApiError(res, error) {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ detail: error.message });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return res.status(500).json({ detail: message });
}
