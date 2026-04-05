import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../_lib/server/auth";
import { badRequest, ok, serverError } from "../_lib/server/http";
import { deleteQuestions } from "../_lib/server/service";
import { sendWebResponse, toWebRequest } from "../_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);
    const request = await toWebRequest(req);
    const payload = (await request.json()) as { questionIds?: string[] };
    if (!Array.isArray(payload.questionIds) || payload.questionIds.length === 0) {
      return sendWebResponse(badRequest("questionIds must be a non-empty array."), res);
    }

    const userId = await resolveUserId(request);
    return sendWebResponse(ok(await deleteQuestions(userId, payload.questionIds)), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
