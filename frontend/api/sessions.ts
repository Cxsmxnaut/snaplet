import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "./_lib/server/auth.js";
import { badRequest, ok, serverError } from "./_lib/server/http.js";
import { startSession } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return sendWebResponse(badRequest("Method not allowed"), res);
    }

    const request = await toWebRequest(req);
    const userId = await resolveUserId(request);
    const payload = (await request.json().catch(() => ({}))) as {
      sourceId?: string;
      mode?: "standard" | "focus" | "weak_review" | "fast_drill";
    };
    const mode = payload.mode;
    if (mode && !["standard", "focus", "weak_review", "fast_drill"].includes(mode)) {
      return sendWebResponse(badRequest("Invalid study mode."), res);
    }

    return sendWebResponse(ok(await startSession(userId, { sourceId: payload.sourceId, mode }), 201), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
