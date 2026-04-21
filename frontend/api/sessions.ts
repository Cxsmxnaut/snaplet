import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "./_lib/server/auth.js";
import { ApiError, assertOptionalString, errorResponse, methodNotAllowed, ok, readJsonObject } from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { startSession } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return sendWebResponse(methodNotAllowed(["POST"]), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const payload = await readJsonObject(request);
    const sourceId = assertOptionalString(payload.sourceId, "sourceId", { maxLength: 128, allowEmpty: true }) ?? undefined;
    const mode = assertOptionalString(payload.mode, "mode", { maxLength: 32, allowEmpty: false }) ?? undefined;

    if (mode && !["standard", "focus", "weak_review", "fast_drill"].includes(mode)) {
      throw new ApiError(400, "Invalid study mode.", { code: "invalid_study_mode" });
    }

    return await runWithRequestContext(
      auth,
      async () =>
        sendWebResponse(
          ok(await startSession(auth.userId, { sourceId, mode: mode as "standard" | "focus" | "weak_review" | "fast_drill" | undefined }), 201),
          res,
        ),
    );
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
