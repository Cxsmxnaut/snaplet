import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "./_lib/server/auth.js";
import {
  ApiError,
  assertOptionalString,
  badRequest,
  errorResponse,
  methodNotAllowed,
  ok,
  readJsonObject,
} from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { createPasteSource, listSourceQuestions, listSourceSummaries } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return sendWebResponse(methodNotAllowed(["GET", "POST"]), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);

    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () =>
        sendWebResponse(ok({ sources: await listSourceSummaries(auth.userId) }), res),
      );
    }

    if (req.method === "POST") {
      const payload = await readJsonObject(request);
      const title = assertOptionalString(payload.title, "title", { maxLength: 160, allowEmpty: true }) ?? "";
      const content = assertOptionalString(payload.content, "content", { maxLength: 120_000 });
      const visibility = assertOptionalString(payload.visibility, "visibility", { maxLength: 16, allowEmpty: false });

      if (!content || content.length < 8) {
        return sendWebResponse(badRequest("Paste at least a few lines of study material."), res);
      }

      if (visibility && !["private", "public"].includes(visibility)) {
        throw new ApiError(400, "Invalid source visibility.", { code: "invalid_visibility" });
      }

      return await runWithRequestContext(auth, async () => {
        const source = await createPasteSource(auth.userId, title, content, {
          visibility: (visibility as "private" | "public" | undefined) ?? "private",
        });
        const questions = await listSourceQuestions(auth.userId, source.id);
        return sendWebResponse(ok({ source, questions }, 201), res);
      });
    }

    return sendWebResponse(methodNotAllowed(["GET", "POST"]), res);
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
