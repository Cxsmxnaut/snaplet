import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveOptionalAuthContext } from "./_lib/server/auth.js";
import {
  ApiError,
  assertOptionalString,
  badRequest,
  errorResponse,
  forbidden,
  isPlainObject,
  methodNotAllowed,
  ok,
  readJsonObject,
  tooManyRequests,
  unauthorized,
} from "./_lib/server/http.js";
import {
  allowsAnonymousProductEvent,
  recordProductEvent,
  validateProductEventTrustBoundary,
} from "./_lib/server/product-events.js";
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
      return sendWebResponse(methodNotAllowed(["POST"]), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveOptionalAuthContext(request);
    const payload = await readJsonObject(request);
    const name = assertOptionalString(payload.name, "name", { maxLength: 80 });
    const sourceId = assertOptionalString(payload.sourceId, "sourceId", { maxLength: 128, nullable: true });
    const sessionId = assertOptionalString(payload.sessionId, "sessionId", { maxLength: 128, nullable: true });
    const properties = payload.properties ?? {};

    if (!name || !isProductEventName(name)) {
      return sendWebResponse(badRequest("Event name is required."), res);
    }

    if (!isPlainObject(properties)) {
      return sendWebResponse(badRequest("Event properties must be a plain object."), res);
    }

    if (Object.keys(properties).length > 25) {
      throw new ApiError(400, "Too many event properties.", {
        code: "too_many_event_properties",
        details: { maxProperties: 25 },
      });
    }

    if (JSON.stringify(properties).length > 4_000) {
      throw new ApiError(400, "Event properties payload is too large.", {
        code: "event_properties_too_large",
        details: { maxBytes: 4_000 },
      });
    }

    if (!auth && !allowsAnonymousProductEvent(name)) {
      return sendWebResponse(unauthorized("Authentication required"), res);
    }

    if (isRateLimited(req, name)) {
      return sendWebResponse(tooManyRequests("Too many event writes. Try again shortly."), res);
    }

    const validatedEvent = await validateProductEventTrustBoundary({
      name,
      userId: auth?.userId ?? null,
      accessToken: auth?.accessToken ?? null,
      sourceId: sourceId ?? null,
      sessionId: sessionId ?? null,
      properties,
    });

    await recordProductEvent({
      name,
      userId: validatedEvent.userId,
      accessToken: auth?.accessToken ?? null,
      sourceId: validatedEvent.sourceId,
      sessionId: validatedEvent.sessionId,
      properties: validatedEvent.properties,
    });

    return sendWebResponse(ok({ accepted: true }, 202), res);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return sendWebResponse(unauthorized(error.message), res);
      }

      if (
        error.message.includes("must be a string") ||
        error.message.includes("Invalid sourceId") ||
        error.message.includes("Invalid sessionId") ||
        error.message.includes("does not match the referenced session")
      ) {
        return sendWebResponse(badRequest(error.message), res);
      }

      if (
        error.message.includes("You do not have permission to attach this source") ||
        error.message.includes("You do not have permission to attach this session")
      ) {
        return sendWebResponse(forbidden(error.message), res);
      }
    }

    return sendWebResponse(errorResponse(error), res);
  }
}
