import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getAnalytics } from "./_lib/overview";
import { allowMethods, handleApiError } from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const analytics = await getAnalytics();
    return res.status(200).json(analytics);
  } catch (error) {
    return handleApiError(res, error);
  }
}
