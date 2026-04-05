import type { VercelRequest, VercelResponse } from "@vercel/node";

async function readBody(req: VercelRequest): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object" && !(req.body instanceof Uint8Array)) {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

export async function toWebRequest(req: VercelRequest): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  const body = await readBody(req);
  return new Request(url, {
    method: req.method,
    headers,
    body,
    duplex: "half",
  } as RequestInit);
}

export async function sendWebResponse(response: Response, res: VercelResponse): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const arrayBuffer = await response.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
}

export function requireParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
