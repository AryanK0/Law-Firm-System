"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const clients_1 = require("./_lib/clients");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET", "POST"])) {
            return;
        }
        if (req.method === "GET") {
            const clients = await (0, clients_1.listClients)((0, http_1.getTrimmedQueryValue)(req.query.search));
            return res.status(200).json(clients);
        }
        const created = await (0, clients_1.createClient)((0, http_1.readBody)(req));
        return res.status(200).json(created);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
