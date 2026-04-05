import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "./_lib/server/auth";
import { badRequest, ok, serverError } from "./_lib/server/http";
import { createPasteSource, listSources } from "./_lib/server/service";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = await toWebRequest(req);
    const userId = await resolveUserId(request);

    if (req.method === "GET") {
      return sendWebResponse(ok({ sources: await listSources(userId) }), res);
    }

    if (req.method === "POST") {
      const payload = (await request.json()) as { title?: string; content?: string };
      if (!payload.content || payload.content.trim().length < 8) {
        return sendWebResponse(badRequest("Paste at least a few lines of study material."), res);
      }
      return sendWebResponse(ok({ source: await createPasteSource(userId, payload.title ?? "", payload.content) }, 201), res);
    }

    return sendWebResponse(badRequest("Method not allowed"), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
