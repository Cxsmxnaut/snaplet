import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { deleteQuestions } from "../_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(methodNotAllowed(), res);
    const request = await toWebRequest(req);
    const payload = (await request.json().catch(() => null)) as { questionIds?: string[] } | null;
    if (!payload) {
      return sendWebResponse(badRequest("Request body must be valid JSON."), res);
    }
    if (!Array.isArray(payload.questionIds) || payload.questionIds.length === 0) {
      return sendWebResponse(badRequest("questionIds must be a non-empty array."), res);
    }

    const auth = await resolveAuthContext(request);
    return await runWithRequestContext(auth, async () => sendWebResponse(ok(await deleteQuestions(auth.userId, payload.questionIds)), res));
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
