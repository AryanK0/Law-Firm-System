import type { VercelRequest, VercelResponse } from "@vercel/node";

import { listDocuments } from "./_lib/documents";
import {
  allowMethods,
  getNumberQueryValue,
  getTrimmedQueryValue,
  handleApiError,
} from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET"])) {
      return;
    }

    const documents = await listDocuments({
      employeeId: getNumberQueryValue(req.query.employee_id, "employee_id"),
      caseId: getNumberQueryValue(req.query.case_id, "case_id"),
      search: getTrimmedQueryValue(req.query.search),
    });

    return res.status(200).json(documents);
  } catch (error) {
    return handleApiError(res, error);
  }
}
