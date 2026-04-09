import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../_lib/server/http.js";
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
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);

    const request = await toWebRequest(req);
    const userId = await resolveUserId(request);
    const body = (await request.json()) as CsvRequest;

    if (!body.csvText || body.csvText.trim().length === 0) {
      return sendWebResponse(badRequest("CSV text is required."), res);
    }

    if (body.mode === "preview") {
      return sendWebResponse(ok(await previewCsv(body.csvText)), res);
    }

    return sendWebResponse(ok({ source: await importCsvFromText(userId, body.title ?? "CSV Import", body.csvText, body.mapping) }, 201), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
