import type { VercelRequest, VercelResponse } from "@vercel/node";
import Busboy from "busboy";
import { resolveUserId } from "../_lib/server/auth.js";
import { badRequest, ok, serverError } from "../_lib/server/http.js";
import { listSourceQuestions, uploadSource } from "../_lib/server/service.js";
import { sendWebResponse } from "../_lib/vercel-bridge.js";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"];

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseUploadFile(req: VercelRequest): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType) {
      resolve(null);
      return;
    }

    const busboy = Busboy({ headers: { "content-type": contentType } });
    let resolvedFile: File | null = null;

    busboy.on("file", (_fieldName, fileStream, info) => {
      const chunks: Buffer[] = [];

      fileStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      fileStream.on("error", reject);
      fileStream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolvedFile = new File([buffer], info.filename, {
          type: info.mimeType || "application/octet-stream",
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve(resolvedFile));

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

    const userId = await resolveUserId(headerOnlyRequest(req));
    const file = await parseUploadFile(req);

    if (!(file instanceof File)) return sendWebResponse(badRequest("Upload is missing a file payload."), res);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return sendWebResponse(badRequest("Supported files: .pdf, .docx, .txt, .md, .csv"), res);
    }
    if (file.size > 8 * 1024 * 1024) {
      return sendWebResponse(badRequest("File size exceeds 8MB limit."), res);
    }

    const source = await uploadSource(userId, file);
    const questions = await listSourceQuestions(userId, source.id);
    return sendWebResponse(ok({ source, questions }, 201), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
