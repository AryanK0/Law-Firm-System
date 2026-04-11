import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createCase, listCases } from "./_lib/cases";
import {
  allowMethods,
  getNumberQueryValue,
  getTrimmedQueryValue,
  handleApiError,
  readBody,
} from "./_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["GET", "POST"])) {
      return;
    }

    if (req.method === "GET") {
      const employeeId = getNumberQueryValue(req.query.employee_id, "employee_id");
      if (typeof employeeId !== "number") {
        return res.status(400).json({ detail: "employee_id is required." });
      }

      const cases = await listCases(employeeId, {
        status: getTrimmedQueryValue(req.query.status),
        search: getTrimmedQueryValue(req.query.search),
      });

      return res.status(200).json(cases);
    }

    const payload = readBody<{
      case_code?: string;
      title: string;
      description?: string;
      case_type?: string;
      client_id: number;
      lead_partner_id?: number;
      lead_senior_id?: number;
      status?: string;
      confidentiality_level?: string;
      created_by?: number;
      start_date?: string;
      end_date?: string;
    }>(req);

    const created = await createCase(payload);
    return res.status(200).json(created);
  } catch (error) {
    return handleApiError(res, error);
  }
}
