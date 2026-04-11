import type { VercelRequest, VercelResponse } from "@vercel/node";

import { listEmployees } from "./_lib/employees";
import { allowMethods, handleApiError } from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const employees = await listEmployees();
    return res.status(200).json(employees);
  } catch (error) {
    return handleApiError(res, error);
  }
}
