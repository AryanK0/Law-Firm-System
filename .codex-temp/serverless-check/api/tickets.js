"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const tickets_1 = require("./_lib/tickets");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET", "POST"])) {
            return;
        }
        if (req.method === "GET") {
            const tickets = await (0, tickets_1.listTickets)({
                status: (0, http_1.getTrimmedQueryValue)(req.query.status),
                priority: (0, http_1.getTrimmedQueryValue)(req.query.priority),
                search: (0, http_1.getTrimmedQueryValue)(req.query.search),
            });
            return res.status(200).json(tickets);
        }
        const created = await (0, tickets_1.createTicket)((0, http_1.readBody)(req));
        return res.status(200).json(created);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
