import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { importCsvFromText, previewCsv } from "../_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "../_lib/vercel-bridge.js";
import type { CSVMapping } from "../_lib/domain/types.js";

interface CsvRequest {
  mode?: "preview" | "import";
  title?: string;
  csvText?: string;
  mapping?: CSVMapping;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(methodNotAllowed(), res);

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const body = (await request.json().catch(() => null)) as CsvRequest | null;
    if (!body) {
      return sendWebResponse(badRequest("Request body must be valid JSON."), res);
    }

    if (!body.csvText || body.csvText.trim().length === 0) {
      return sendWebResponse(badRequest("CSV text is required."), res);
    }

    if (body.mode === "preview") {
      return sendWebResponse(ok(await previewCsv(body.csvText)), res);
    }

    return await runWithRequestContext(
      auth,
      async () => sendWebResponse(ok({ source: await importCsvFromText(auth.userId, body.title ?? "CSV Import", body.csvText, body.mapping) }, 201), res),
    );
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
