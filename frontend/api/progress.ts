import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "./_lib/server/auth";
import { ok, serverError, badRequest } from "./_lib/server/http";
import { getProgress } from "./_lib/server/service";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendWebResponse(badRequest("Method not allowed"), res);
    }
    const userId = await resolveUserId(await toWebRequest(req));
    return sendWebResponse(ok(await getProgress(userId)), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
