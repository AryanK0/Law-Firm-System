"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const overview_1 = require("./_lib/overview");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET"])) {
            return;
        }
        const overview = await (0, overview_1.getOverview)();
        return res.status(200).json(overview);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
