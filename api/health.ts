import type { VercelRequest, VercelResponse } from "@vercel/node";

import { queryOne } from "./_lib/db";
import { allowMethods, handleApiError } from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const database = await queryOne<{ database_time: string }>(
      "SELECT NOW() AS database_time",
    );

    return res.status(200).json({
      status: "ok",
      database: "connected",
      database_time: database?.database_time ?? null,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
