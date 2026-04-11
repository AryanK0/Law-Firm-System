"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveUploadedFile = saveUploadedFile;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const blob_1 = require("@vercel/blob");
const http_1 = require("./http");
function sanitizeFileName(fileName) {
    return node_path_1.default.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}
async function saveUploadedFile(input) {
    const safeName = `${Date.now()}_${sanitizeFileName(input.fileName)}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        const uploaded = await (0, blob_1.put)(`uploads/${safeName}`, input.buffer, {
            access: "public",
            addRandomSuffix: false,
            contentType: input.contentType,
        });
        return {
            filePath: uploaded.url,
            fileUrl: uploaded.url,
            storedName: safeName,
        };
    }
    if (process.env.VERCEL) {
        throw new http_1.ApiError(500, "Document uploads on Vercel require BLOB_READ_WRITE_TOKEN.");
    }
    const uploadDir = node_path_1.default.join(process.cwd(), "frontend", "public", "uploads");
    await promises_1.default.mkdir(uploadDir, { recursive: true });
    await promises_1.default.writeFile(node_path_1.default.join(uploadDir, safeName), input.buffer);
    return {
        filePath: `uploads/${safeName}`,
        fileUrl: `/uploads/${safeName}`,
        storedName: safeName,
    };
}
