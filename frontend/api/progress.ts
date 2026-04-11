import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "./_lib/server/auth.js";
import { badRequest, ok, serverError } from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { getProgress } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendWebResponse(badRequest("Method not allowed"), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    return await runWithRequestContext(auth, async () => sendWebResponse(ok(await getProgress(auth.userId)), res));
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
