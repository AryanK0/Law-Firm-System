import type { VercelRequest, VercelResponse } from "@vercel/node";

import { resolveTicket } from "../../_lib/tickets";
import {
  allowMethods,
  handleApiError,
  parseRouteId,
  readBody,
} from "../../_lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (!allowMethods(req, res, ["PATCH"])) {
      return;
    }

    const ticketId = parseRouteId(req.query.id, "ticket id");
    const payload = readBody<{ employee_id: number }>(req);
    const resolved = await resolveTicket(ticketId, payload.employee_id);
    return res.status(200).json(resolved);
  } catch (error) {
    return handleApiError(res, error);
  }
}
