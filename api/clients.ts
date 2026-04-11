import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createClient, listClients } from "./_lib/clients";
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
      const clients = await listClients(getTrimmedQueryValue(req.query.search));
      return res.status(200).json(clients);
    }

    const created = await createClient(
      readBody<{
        name?: string;
        organization?: string;
        contact_info?: string;
      }>(req),
    );

    return res.status(200).json(created);
  } catch (error) {
    return handleApiError(res, error);
  }
}
