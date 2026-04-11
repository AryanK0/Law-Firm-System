import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createTicket, listTickets } from "./_lib/tickets";
import {
  allowMethods,
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
      const tickets = await listTickets({
        status: getTrimmedQueryValue(req.query.status),
        priority: getTrimmedQueryValue(req.query.priority),
        search: getTrimmedQueryValue(req.query.search),
      });

      return res.status(200).json(tickets);
    }

    const created = await createTicket(
      readBody<{
        raised_by: number;
        description: string;
        priority?: string;
        status?: string;
        assigned_to?: number;
        resolution_deadline?: string;
      }>(req),
    );

    return res.status(200).json(created);
  } catch (error) {
    return handleApiError(res, error);
  }
}
