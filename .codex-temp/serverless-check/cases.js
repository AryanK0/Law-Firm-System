"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const cases_1 = require("./_lib/cases");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET", "POST"])) {
            return;
        }
        if (req.method === "GET") {
            const employeeId = (0, http_1.getNumberQueryValue)(req.query.employee_id, "employee_id");
            if (typeof employeeId !== "number") {
                return res.status(400).json({ detail: "employee_id is required." });
            }
            const cases = await (0, cases_1.listCases)(employeeId, {
                status: (0, http_1.getTrimmedQueryValue)(req.query.status),
                search: (0, http_1.getTrimmedQueryValue)(req.query.search),
            });
            return res.status(200).json(cases);
        }
        const payload = (0, http_1.readBody)(req);
        const created = await (0, cases_1.createCase)(payload);
        return res.status(200).json(created);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
