"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const db_1 = require("./_lib/db");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET"])) {
            return;
        }
        const database = await (0, db_1.queryOne)("SELECT NOW() AS database_time");
        return res.status(200).json({
            status: "ok",
            database: "connected",
            database_time: database?.database_time ?? null,
        });
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
