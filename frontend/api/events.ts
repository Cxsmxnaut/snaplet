import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveOptionalAuthContext } from "./_lib/server/auth.js";
import { badRequest, errorResponse, methodNotAllowed, ok } from "./_lib/server/http.js";
import { recordProductEvent } from "./_lib/server/product-events.js";
import { isProductEventName } from "../shared/product-events.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

const EVENT_WINDOW_MS = 60_000;
const EVENT_LIMIT_PER_WINDOW = 60;
const eventRateBuckets = new Map<string, { count: number; resetAt: number }>();

function readClientAddress(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0] ?? "unknown";
  }

  return forwarded?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function rateLimitKey(req: VercelRequest, eventName: string): string {
  return `${readClientAddress(req)}:${eventName}`;
}

function isRateLimited(req: VercelRequest, eventName: string): boolean {
  const key = rateLimitKey(req, eventName);
  const now = Date.now();
  const bucket = eventRateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    eventRateBuckets.set(key, {
      count: 1,
      resetAt: now + EVENT_WINDOW_MS,
    });
    return false;
  }

  if (bucket.count >= EVENT_LIMIT_PER_WINDOW) {
    return true;
  }

  bucket.count += 1;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return sendWebResponse(methodNotAllowed(), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveOptionalAuthContext(request);
    const payload = (await request.json().catch(() => null)) as {
      name?: string;
      sourceId?: string | null;
      sessionId?: string | null;
      properties?: Record<string, unknown>;
    } | null;

    if (!payload || typeof payload.name !== "string" || !isProductEventName(payload.name)) {
      return sendWebResponse(badRequest("Event name is required."), res);
    }

    if (isRateLimited(req, payload.name)) {
      return sendWebResponse(
        Response.json({ error: "Too many event writes. Try again shortly." }, { status: 429 }),
        res,
      );
    }

    await recordProductEvent({
      name: payload.name,
      userId: auth?.userId ?? null,
      accessToken: auth?.accessToken ?? null,
      sourceId: payload.sourceId ?? null,
      sessionId: payload.sessionId ?? null,
      properties: payload.properties ?? {},
    });

    return sendWebResponse(ok({ accepted: true }, 202), res);
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}
