import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getOverview } from "./_lib/overview";
import { allowMethods, handleApiError } from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const overview = await getOverview();
    return res.status(200).json(overview);
  } catch (error) {
    return handleApiError(res, error);
  }
}
