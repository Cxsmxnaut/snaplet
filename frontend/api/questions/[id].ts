import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { deleteQuestions, updateQuestion } from "../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const id = requireParam(req.query.id);

    if (id === "bulk") {
      if (req.method !== "POST") return sendWebResponse(methodNotAllowed(), res);

      const payload = (await request.json().catch(() => null)) as { questionIds?: string[] } | null;
      if (!payload) {
        return sendWebResponse(badRequest("Request body must be valid JSON."), res);
      }
      if (!Array.isArray(payload.questionIds) || payload.questionIds.length === 0) {
        return sendWebResponse(badRequest("questionIds must be a non-empty array."), res);
      }

      return await runWithRequestContext(auth, async () => sendWebResponse(ok(await deleteQuestions(auth.userId, payload.questionIds)), res));
    }

    if (req.method !== "PATCH") return sendWebResponse(methodNotAllowed(), res);
    const payload = (await request.json().catch(() => null)) as { prompt?: string; answer?: string } | null;

    if (!id) return sendWebResponse(badRequest("Question id is required."), res);
    if (!payload) return sendWebResponse(badRequest("Request body must be valid JSON."), res);
    if (!payload.prompt && !payload.answer) return sendWebResponse(badRequest("Nothing to update."), res);

    return await runWithRequestContext(auth, async () => sendWebResponse(ok({ question: await updateQuestion(auth.userId, id, payload) }), res));
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
