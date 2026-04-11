import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { archiveSource, getSource } from "../_lib/server/service.js";
import { requireParam, sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = requireParam(req.query.id);
    if (!id) return sendWebResponse(badRequest("Missing source id."), res);

    const auth = await resolveAuthContext(await toWebRequest(req));
    if (req.method === "GET") {
      return await runWithRequestContext(auth, async () => sendWebResponse(ok({ source: await getSource(auth.userId, id) }), res));
    }
    if (req.method === "DELETE") {
      return await runWithRequestContext(auth, async () => {
        await archiveSource(auth.userId, id);
        return sendWebResponse(ok({ deleted: true }), res);
      });
    }

    return sendWebResponse(badRequest("Method not allowed"), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
