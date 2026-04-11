"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const documents_1 = require("./_lib/documents");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET"])) {
            return;
        }
        const documents = await (0, documents_1.listDocuments)({
            employeeId: (0, http_1.getNumberQueryValue)(req.query.employee_id, "employee_id"),
            caseId: (0, http_1.getNumberQueryValue)(req.query.case_id, "case_id"),
            search: (0, http_1.getTrimmedQueryValue)(req.query.search),
        });
        return res.status(200).json(documents);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
