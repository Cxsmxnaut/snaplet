import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveUserId } from "../_lib/server/auth";
import { badRequest, ok, serverError } from "../_lib/server/http";
import { uploadSource } from "../_lib/server/service";
import { sendWebResponse, toWebRequest } from "../_lib/vercel-bridge";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);

    const request = await toWebRequest(req);
    const userId = await resolveUserId(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return sendWebResponse(badRequest("Upload is missing a file payload."), res);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return sendWebResponse(badRequest("Supported files: .pdf, .docx, .txt, .md, .csv"), res);
    }
    if (file.size > 8 * 1024 * 1024) {
      return sendWebResponse(badRequest("File size exceeds 8MB limit."), res);
    }

    return sendWebResponse(ok({ source: await uploadSource(userId, file) }, 201), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
