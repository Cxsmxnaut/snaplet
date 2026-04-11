import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "./_lib/server/auth.js";
import { badRequest, ok, serverError } from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { createPasteSource, listSourceQuestions, listSources } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);

    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () => sendWebResponse(ok({ sources: await listSources(auth.userId) }), res));
    }

    if (req.method === "POST") {
      const payload = (await request.json()) as { title?: string; content?: string };
      if (!payload.content || payload.content.trim().length < 8) {
        return sendWebResponse(badRequest("Paste at least a few lines of study material."), res);
      }
      return await runWithRequestContext(auth, async () => {
        const source = await createPasteSource(auth.userId, payload.title ?? "", payload.content);
        const questions = await listSourceQuestions(auth.userId, source.id);
        return sendWebResponse(ok({ source, questions }, 201), res);
      });
    }

    return sendWebResponse(badRequest("Method not allowed"), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
