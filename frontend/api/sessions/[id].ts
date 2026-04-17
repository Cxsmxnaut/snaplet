import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { getSessionDetails, submitAttempt } from "../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Session id is required."), res);
    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    if (action === "attempts") {
      if (req.method !== "POST") return sendWebResponse(methodNotAllowed(), res);

      const payload = (await request.json().catch(() => null)) as { questionId?: string; answer?: string; isRetry?: boolean } | null;
      if (!payload) return sendWebResponse(badRequest("Request body must be valid JSON."), res);
      if (!payload.questionId) return sendWebResponse(badRequest("Session id and question id are required."), res);
      if (!payload.answer || payload.answer.trim().length === 0) return sendWebResponse(badRequest("Answer cannot be empty."), res);

      return await runWithRequestContext(
        auth,
        async () =>
          sendWebResponse(
            ok(
              await submitAttempt(auth.userId, id, {
                questionId: payload.questionId,
                answer: payload.answer,
                isRetry: payload.isRetry,
              }),
            ),
            res,
          ),
      );
    }

    if (req.method !== "GET") {
      return sendWebResponse(methodNotAllowed(), res);
    }

    return await runWithRequestContext(
      auth,
      async () => sendWebResponse(ok(await getSessionDetails(auth.userId, id)), res),
    );
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
