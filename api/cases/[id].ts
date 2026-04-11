import type { VercelRequest, VercelResponse } from "@vercel/node";

import { ensureCaseAccess, getCaseDetail } from "../_lib/cases";
import {
  allowMethods,
  getNumberQueryValue,
  handleApiError,
  parseRouteId,
} from "../_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const caseId = parseRouteId(req.query.id, "case id");
    const employeeId = getNumberQueryValue(req.query.employee_id, "employee_id");

    if (typeof employeeId !== "number") {
      return res.status(400).json({ detail: "employee_id is required." });
    }

    await ensureCaseAccess(employeeId, caseId);
    const detail = await getCaseDetail(caseId);
    return res.status(200).json(detail);
  } catch (error) {
    return handleApiError(res, error);
  }
}
