import type { VercelRequest, VercelResponse } from "@vercel/node";
import Busboy from "busboy";
import { resolveAuthContext } from "../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../_lib/server/http.js";
import { runWithRequestContext } from "../_lib/server/request-context.js";
import { listSourceQuestions, uploadSource } from "../_lib/server/service.js";
import { sendWebResponse } from "../_lib/vercel-bridge.js";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseUploadFile(req: VercelRequest): Promise<{ file: File | null; error: string | null }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType) {
      resolve({ file: null, error: "Upload is missing a multipart form payload." });
      return;
    }

    let busboy: Busboy.Busboy;
    try {
      busboy = Busboy({
        headers: { "content-type": contentType },
        limits: {
          files: 1,
          fileSize: MAX_FILE_SIZE_BYTES,
        },
      });
    } catch {
      resolve({ file: null, error: "Could not read uploaded form data." });
      return;
    }

    let resolvedFile: File | null = null;
    let parseError: string | null = null;
    let fileSeen = false;

    busboy.on("file", (_fieldName, fileStream, info) => {
      fileSeen = true;
      if (!info.filename) {
        parseError = "Uploaded file is missing a filename.";
        fileStream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      let hitFileLimit = false;

      fileStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      fileStream.on("limit", () => {
        hitFileLimit = true;
      });
      fileStream.on("error", () => {
        parseError = "Could not read uploaded file data.";
      });
      fileStream.on("end", () => {
        if (parseError) {
          return;
        }
        if (hitFileLimit || fileStream.truncated) {
          parseError = "File size exceeds 8MB limit.";
          return;
        }
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
          parseError = "Uploaded file is empty.";
          return;
        }
        resolvedFile = new File([buffer], info.filename, {
          type: info.mimeType || "application/octet-stream",
        });
      });
    });

    busboy.on("filesLimit", () => {
      parseError = "Upload one file at a time.";
    });
    busboy.on("error", () => {
      resolve({ file: null, error: "Could not parse uploaded form data." });
    });
    busboy.on("finish", () => {
      if (!fileSeen && !parseError) {
        parseError = "Upload is missing a file payload.";
      }
      resolve({ file: parseError ? null : resolvedFile, error: parseError });
    });

    const rawBody = (req as VercelRequest & { rawBody?: Buffer | string }).rawBody;
    if (Buffer.isBuffer(rawBody)) {
      busboy.end(rawBody);
      return;
    }
    if (typeof rawBody === "string") {
      busboy.end(Buffer.from(rawBody));
      return;
    }
    if (Buffer.isBuffer(req.body)) {
      busboy.end(req.body);
      return;
    }
    if (typeof req.body === "string") {
      busboy.end(Buffer.from(req.body));
      return;
    }

    req.pipe(busboy);
  });
}

function headerOnlyRequest(req: VercelRequest): Request {
  const host = req.headers.host ?? "localhost";
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  return new Request(`${protocol}://${host}${req.url ?? "/"}`, {
    method: req.method,
    headers,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return sendWebResponse(badRequest("Method not allowed"), res);

    const auth = await resolveAuthContext(headerOnlyRequest(req));
    const parsed = await parseUploadFile(req);

    if (parsed.error) return sendWebResponse(badRequest(parsed.error), res);

    const { file } = parsed;
    if (!(file instanceof File)) return sendWebResponse(badRequest("Upload is missing a file payload."), res);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return sendWebResponse(badRequest("Supported files: .pdf, .docx, .txt, .md, .csv"), res);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return sendWebResponse(badRequest("File size exceeds 8MB limit."), res);
    }

    return await runWithRequestContext(auth, async () => {
      const source = await uploadSource(auth.userId, file);
      const questions = await listSourceQuestions(auth.userId, source.id);
      return sendWebResponse(ok({ source, questions }, 201), res);
    });
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
