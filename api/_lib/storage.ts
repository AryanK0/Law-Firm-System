import fs from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import { ApiError } from "./http";

function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveUploadedFile(input: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}) {
  const safeName = `${Date.now()}_${sanitizeFileName(input.fileName)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const uploaded = await put(`uploads/${safeName}`, input.buffer, {
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
    throw new ApiError(
      500,
      "Document uploads on Vercel require BLOB_READ_WRITE_TOKEN.",
    );
  }

  const uploadDir = path.join(process.cwd(), "frontend", "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, safeName), input.buffer);

  return {
    filePath: `uploads/${safeName}`,
    fileUrl: `/uploads/${safeName}`,
    storedName: safeName,
  };
}
