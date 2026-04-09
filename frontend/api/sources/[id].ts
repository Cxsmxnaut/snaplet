import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../_lib/server/http.js";
import { archiveSource, getSource } from "../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);

    const userId = await resolveUserId(await toWebRequest(req));
    if (req.method === "GET") return sendWebResponse(ok({ source: await getSource(userId, id) }), res);
    if (req.method === "DELETE") {
      await archiveSource(userId, id);
      return sendWebResponse(ok({ deleted: true }), res);
    }

    return sendWebResponse(badRequest("Method not allowed"), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
