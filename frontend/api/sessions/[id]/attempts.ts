import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../../_lib/server/http.js";
import { submitAttempt } from "../../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);

    const id = requireParam(req.query.id);
    const request = await toWebRequest(req);
    const payload = (await request.json()) as { questionId?: string; answer?: string; isRetry?: boolean };

    if (!id || !payload.questionId) return sendWebResponse(badRequest("Session id and question id are required."), res);
    if (!payload.answer || payload.answer.trim().length === 0) return sendWebResponse(badRequest("Answer cannot be empty."), res);

    const userId = await resolveUserId(request);
    return sendWebResponse(ok(await submitAttempt(userId, id, {
      questionId: payload.questionId,
      answer: payload.answer,
      isRetry: payload.isRetry,
    })), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
