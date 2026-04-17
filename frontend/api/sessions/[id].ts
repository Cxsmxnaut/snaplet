import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { getSessionDetails } from "../_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendWebResponse(methodNotAllowed(), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const sessionId = req.query.id;
    const normalizedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;

    return await runWithRequestContext(
      auth,
      async () => sendWebResponse(ok(await getSessionDetails(auth.userId, normalizedSessionId ?? "")), res),
    );
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
