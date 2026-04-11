import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../../_lib/server/http.js";
import { runWithRequestContext } from "../../_lib/server/request-context.js";
import { createQuestionForSource, listSourceQuestions } from "../../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);

    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () => sendWebResponse(ok({ questions: await listSourceQuestions(auth.userId, id) }), res));
    }

    if (req.method === "POST") {
      const payload = (await request.json().catch(() => null)) as { prompt?: string; answer?: string } | null;
      if (!payload) {
        return sendWebResponse(badRequest("Request body must be valid JSON."), res);
      }
      if (!payload.prompt?.trim() || !payload.answer?.trim()) {
        return sendWebResponse(badRequest("Prompt and answer are required."), res);
      }
      return await runWithRequestContext(
        auth,
        async () => sendWebResponse(ok({ question: await createQuestionForSource(auth.userId, id, { prompt: payload.prompt, answer: payload.answer }) }, 201), res),
      );
    }

    return sendWebResponse(methodNotAllowed(), res);
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
