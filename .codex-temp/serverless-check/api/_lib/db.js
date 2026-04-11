"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryRows = queryRows;
exports.queryOne = queryOne;
exports.execute = execute;
exports.callProcedureOne = callProcedureOne;
const promise_1 = __importDefault(require("mysql2/promise"));
let pool = null;
function getPool() {
    if (pool) {
        return pool;
    }
    pool = promise_1.default.createPool({
        host: process.env.DB_HOST ?? "localhost",
        user: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? "Ar@230806.",
        database: process.env.DB_NAME ?? "lawfirm",
        port: Number(process.env.DB_PORT ?? 3306),
        waitForConnections: true,
        connectionLimit: 5,
        decimalNumbers: true,
        dateStrings: true,
    });
    return pool;
}
async function queryRows(sql, params = []) {
    const [rows] = await getPool().query(sql, params);
    return rows;
}
async function queryOne(sql, params = []) {
    const rows = await queryRows(sql, params);
    return rows[0] ?? null;
}
async function execute(sql, params = []) {
    const [result] = await getPool().execute(sql, params);
    return result;
}
async function callProcedureOne(name, params = []) {
    const placeholders = params.length > 0 ? params.map(() => "?").join(", ") : "";
    const [result] = await getPool().query(`CALL ${name}(${placeholders})`, params);
    if (Array.isArray(result)) {
        for (const item of result) {
            if (Array.isArray(item) && item.length > 0) {
                return item[0];
            }
        }
        if (result.length > 0 && !Array.isArray(result[0])) {
            return result[0];
        }
    }
    return null;
}
