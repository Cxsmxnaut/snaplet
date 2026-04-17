import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import {
  archiveSource,
  createQuestionForSource,
  duplicateSource,
  generateSourceQuestions,
  getActiveSourceSession,
  getSource,
  listSourceQuestions,
  updateSourceVisibility,
} from "../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    if (action === "active-session") {
      if (req.method !== "GET") {
        return sendWebResponse(methodNotAllowed(), res);
      }

      return await runWithRequestContext(
        auth,
        async () => sendWebResponse(ok({ session: await getActiveSourceSession(auth.userId, id) }), res),
      );
    }

    if (action === "duplicate") {
      if (req.method !== "POST") {
        return sendWebResponse(methodNotAllowed(), res);
      }

      return await runWithRequestContext(
        auth,
        async () => sendWebResponse(ok({ source: await duplicateSource(auth.userId, id) }, 201), res),
      );
    }

    if (action === "generate") {
      if (req.method !== "POST") {
        return sendWebResponse(methodNotAllowed(), res);
      }

      return await runWithRequestContext(auth, async () => sendWebResponse(ok(await generateSourceQuestions(auth.userId, id)), res));
    }

    if (action === "questions") {
      if (req.method === "GET") {
        return await runWithRequestContext(
          auth,
          async () => sendWebResponse(ok({ questions: await listSourceQuestions(auth.userId, id) }), res),
        );
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
          async () =>
            sendWebResponse(
              ok({ question: await createQuestionForSource(auth.userId, id, { prompt: payload.prompt, answer: payload.answer }) }, 201),
              res,
            ),
        );
      }

      return sendWebResponse(methodNotAllowed(), res);
    }

    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () => sendWebResponse(ok({ source: await getSource(auth.userId, id) }), res));
    }
    if (req.method === "PATCH") {
      const payload = (await request.json().catch(() => null)) as { visibility?: "private" | "public" } | null;
      if (!payload || !payload.visibility || !["private", "public"].includes(payload.visibility)) {
        return sendWebResponse(badRequest("Valid visibility is required."), res);
      }
      return await runWithRequestContext(auth, async () =>
        sendWebResponse(ok({ source: await updateSourceVisibility(auth.userId, id, payload.visibility) }), res),
      );
    }
    if (req.method === "DELETE") {
      return await runWithRequestContext(auth, async () => {
        await archiveSource(auth.userId, id);
        return sendWebResponse(ok({ deleted: true }), res);
      });
    }

    return sendWebResponse(methodNotAllowed(), res);
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
