"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const employees_1 = require("./_lib/employees");
const http_1 = require("./_lib/http");
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["GET"])) {
            return;
        }
        const employees = await (0, employees_1.listEmployees)();
        return res.status(200).json(employees);
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
