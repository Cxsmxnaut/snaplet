import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "./_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { createPasteSource, listSourceQuestions, listSourceSummaries } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);

    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () =>
        sendWebResponse(ok({ sources: await listSourceSummaries(auth.userId) }), res),
      );
    }

    if (req.method === "POST") {
      const payload = (await request.json().catch(() => null)) as {
        title?: string;
        content?: string;
        visibility?: "private" | "public";
      } | null;
      if (!payload) {
        return sendWebResponse(badRequest("Request body must be valid JSON."), res);
      }
      if (!payload.content || payload.content.trim().length < 8) {
        return sendWebResponse(badRequest("Paste at least a few lines of study material."), res);
      }
      if (payload.visibility && !["private", "public"].includes(payload.visibility)) {
        return sendWebResponse(badRequest("Invalid source visibility."), res);
      }
      return await runWithRequestContext(auth, async () => {
        const source = await createPasteSource(auth.userId, payload.title ?? "", payload.content, {
          visibility: payload.visibility ?? "private",
        });
        const questions = await listSourceQuestions(auth.userId, source.id);
        return sendWebResponse(ok({ source, questions }, 201), res);
      });
    }

    return sendWebResponse(methodNotAllowed(), res);
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
