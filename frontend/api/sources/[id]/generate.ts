import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../../_lib/server/http.js";
import { runWithRequestContext } from "../../_lib/server/request-context.js";
import { generateSourceQuestions } from "../../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(methodNotAllowed(), res);
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);
    const auth = await resolveAuthContext(await toWebRequest(req));
    return await runWithRequestContext(auth, async () => sendWebResponse(ok(await generateSourceQuestions(auth.userId, id)), res));
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
