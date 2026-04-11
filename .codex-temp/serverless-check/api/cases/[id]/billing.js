"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const cases_1 = require("../../_lib/cases");
const http_1 = require("../../_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET"])) {
            return;
        }
        const caseId = (0, http_1.parseRouteId)(req.query.id, "case id");
        const employeeId = (0, http_1.getNumberQueryValue)(req.query.employee_id, "employee_id");
        if (typeof employeeId !== "number") {
            return res.status(400).json({ detail: "employee_id is required." });
        }
        await (0, cases_1.ensureCaseAccess)(employeeId, caseId);
        const billing = await (0, cases_1.getCaseBilling)(caseId);
        return res.status(200).json(billing);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
