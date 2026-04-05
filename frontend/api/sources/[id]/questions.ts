import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../../_lib/server/auth";
import { badRequest, ok, serverError } from "../../_lib/server/http";
import { createQuestionForSource, listSourceQuestions } from "../../_lib/server/service";
import { requireParam, sendWebResponse, toWebRequest } from "../../_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);

    const request = await toWebRequest(req);
    const userId = await resolveUserId(request);

    if (req.method === "GET") {
      return sendWebResponse(ok({ questions: await listSourceQuestions(userId, id) }), res);
    }

    if (req.method === "POST") {
      const payload = (await request.json()) as { prompt?: string; answer?: string };
      if (!payload.prompt?.trim() || !payload.answer?.trim()) {
        return sendWebResponse(badRequest("Prompt and answer are required."), res);
      }
      return sendWebResponse(ok({ question: await createQuestionForSource(userId, id, { prompt: payload.prompt, answer: payload.answer }) }, 201), res);
    }

    return sendWebResponse(badRequest("Method not allowed"), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
