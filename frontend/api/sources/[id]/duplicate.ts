import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../../_lib/server/auth";
import { badRequest, ok, serverError } from "../../_lib/server/http";
import { duplicateSource } from "../../_lib/server/service";
import { requireParam, sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);
    const userId = await resolveUserId(await toWebRequest(req));
    return sendWebResponse(ok({ source: await duplicateSource(userId, id) }, 201), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
