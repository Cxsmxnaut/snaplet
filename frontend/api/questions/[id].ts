import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../_lib/server/auth";
import { badRequest, ok, serverError } from "../_lib/server/http";
import { updateQuestion } from "../_lib/server/service";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "PATCH") return sendWebResponse(badRequest("Method not allowed"), res);
    const id = requireParam(req.query.id);
    const request = await toWebRequest(req);
    const payload = (await request.json()) as { prompt?: string; answer?: string };

    if (!id) return sendWebResponse(badRequest("Question id is required."), res);
    if (!payload.prompt && !payload.answer) return sendWebResponse(badRequest("Nothing to update."), res);

    const userId = await resolveUserId(request);
    return sendWebResponse(ok({ question: await updateQuestion(userId, id, payload) }), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
