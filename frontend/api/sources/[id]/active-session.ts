import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../../_lib/server/auth.js";
import { errorResponse, methodNotAllowed, ok } from "../../_lib/server/http.js";
import { runWithRequestContext } from "../../_lib/server/request-context.js";
import { getActiveSourceSession } from "../../_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendWebResponse(methodNotAllowed(), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const sourceId = req.query.id;
    const normalizedSourceId = Array.isArray(sourceId) ? sourceId[0] : sourceId;

    return await runWithRequestContext(
      auth,
      async () => sendWebResponse(ok({ session: await getActiveSourceSession(auth.userId, normalizedSourceId ?? "") }), res),
    );
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
