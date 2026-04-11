"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const tickets_1 = require("../../_lib/tickets");
const http_1 = require("../../_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["PATCH"])) {
            return;
        }
        const ticketId = (0, http_1.parseRouteId)(req.query.id, "ticket id");
        const payload = (0, http_1.readBody)(req);
        const resolved = await (0, tickets_1.resolveTicket)(ticketId, payload.employee_id);
        return res.status(200).json(resolved);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
