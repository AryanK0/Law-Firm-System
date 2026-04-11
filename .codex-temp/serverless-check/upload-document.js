"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
const promises_1 = __importDefault(require("node:fs/promises"));
const formidable_1 = __importDefault(require("formidable"));
const cases_1 = require("./_lib/cases");
const documents_1 = require("./_lib/documents");
const http_1 = require("./_lib/http");
const storage_1 = require("./_lib/storage");
exports.config = {
    api: {
        bodyParser: false,
    },
};
function parseForm(req) {
    const form = (0, formidable_1.default)({
        multiples: false,
        maxFiles: 1,
        keepExtensions: true,
    });
    return new Promise((resolve, reject) => {
        form.parse(req, (error, fields, files) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ fields, files });
        });
    });
}
function getFormValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
async function handler(req, res) {
    try {
        if (!(0, http_1.allowMethods)(req, res, ["POST"])) {
            return;
        }
        const caseId = (0, http_1.getNumberQueryValue)(req.query.case_id, "case_id");
        const uploadedBy = (0, http_1.getNumberQueryValue)(req.query.uploaded_by, "uploaded_by");
        const confidentiality = (0, http_1.getTrimmedQueryValue)(req.query.confidentiality_level) ?? "Internal";
        if (typeof caseId !== "number") {
            throw new http_1.ApiError(400, "case_id is required.");
        }
        if (typeof uploadedBy === "number") {
            await (0, cases_1.ensureCaseAccess)(uploadedBy, caseId);
        }
        const { files, fields } = await parseForm(req);
        const fileInput = files.file;
        const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
        if (!file?.originalFilename) {
            throw new http_1.ApiError(400, "Please choose a file to upload.");
        }
        const buffer = await promises_1.default.readFile(file.filepath);
        const saved = await (0, storage_1.saveUploadedFile)({
            buffer,
            fileName: file.originalFilename,
            contentType: file.mimetype ?? undefined,
        });
        const response = await (0, documents_1.createDocumentRecord)({
            caseId,
            uploadedBy,
            confidentialityLevel: getFormValue(fields.confidentiality_level) ??
                confidentiality,
            filePath: saved.filePath,
        });
        return res.status(200).json({
            ...response,
            file_name: file.originalFilename,
            file_url: saved.fileUrl,
        });
    }
    catch (error) {
        return (0, http_1.handleApiError)(res, error);
    }
}
