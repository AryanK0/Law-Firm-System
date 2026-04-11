import fs from "node:fs/promises";

import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";

import { ensureCaseAccess } from "./_lib/cases";
import { createDocumentRecord } from "./_lib/documents";
import {
  allowMethods,
  ApiError,
  getNumberQueryValue,
  getTrimmedQueryValue,
  handleApiError,
} from "./_lib/http";
import { saveUploadedFile } from "./_lib/storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: VercelRequest) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    keepExtensions: true,
  });

  return new Promise<{
    fields: Record<string, string | string[] | undefined>;
    files: Record<string, any>;
  }>((resolve, reject) => {
    form.parse(req, (error: any, fields: any, files: any) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function getFormValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["POST"])) {
      return;
    }

    const caseId = getNumberQueryValue(req.query.case_id, "case_id");
    const uploadedBy = getNumberQueryValue(req.query.uploaded_by, "uploaded_by");
    const confidentiality =
      getTrimmedQueryValue(req.query.confidentiality_level) ?? "Internal";

    if (typeof caseId !== "number") {
      throw new ApiError(400, "case_id is required.");
    }

    if (typeof uploadedBy === "number") {
      await ensureCaseAccess(uploadedBy, caseId);
    }

    const { files, fields } = await parseForm(req);
    const fileInput = files.file;
    const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;

    if (!file?.originalFilename) {
      throw new ApiError(400, "Please choose a file to upload.");
    }

    const buffer = await fs.readFile(file.filepath);
    const saved = await saveUploadedFile({
      buffer,
      fileName: file.originalFilename,
      contentType: file.mimetype ?? undefined,
    });

    const response = await createDocumentRecord({
      caseId,
      uploadedBy,
      confidentialityLevel:
        getFormValue(fields.confidentiality_level as string | string[] | undefined) ??
        confidentiality,
      filePath: saved.filePath,
    });

    return res.status(200).json({
      ...response,
      file_name: file.originalFilename,
      file_url: saved.fileUrl,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
