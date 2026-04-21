import type { ProductEventName } from "../../../shared/product-events.js";
import { getRequestContext } from "./request-context.js";
import { createSupabaseServerClient } from "./supabase-server.js";

type ProductEventRecord = {
  name: ProductEventName;
  userId?: string | null;
  accessToken?: string | null;
  sourceId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
};

const ANONYMOUS_EVENT_NAMES = new Set<ProductEventName>([
  "auth_viewed",
  "auth_oauth_started",
  "auth_password_submitted",
  "auth_signed_in",
  "auth_signed_up",
  "auth_reset_requested",
  "auth_signed_out",
]);

const ENTITY_ID_PATTERN = /^(src|ses)_[a-z0-9-]{8,}$/i;

function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    return sanitizeProperties(value as Record<string, unknown>);
  }

  return String(value).slice(0, 500);
}

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties)
      .slice(0, 25)
      .map(([key, value]) => [key.slice(0, 80), sanitizeValue(value)]),
  );
}

function normalizeOptionalEntityId(
  value: string | null | undefined,
  fieldName: "sourceId" | "sessionId",
  expectedPrefix: "src" | "ses",
): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!trimmed.startsWith(`${expectedPrefix}_`) || !ENTITY_ID_PATTERN.test(trimmed)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return trimmed;
}

export function allowsAnonymousProductEvent(name: ProductEventName): boolean {
  return ANONYMOUS_EVENT_NAMES.has(name);
}

export async function validateProductEventTrustBoundary(event: ProductEventRecord): Promise<{
  userId: string | null;
  sourceId: string | null;
  sessionId: string | null;
  properties: Record<string, unknown>;
}> {
  const context = getRequestContext();
  const userId = event.userId ?? context?.userId ?? null;
  const accessToken = event.accessToken ?? context?.accessToken ?? null;
  const sourceId = normalizeOptionalEntityId(event.sourceId, "sourceId", "src");
  const sessionId = normalizeOptionalEntityId(event.sessionId, "sessionId", "ses");
  const properties = sanitizeProperties(event.properties ?? {});

  if (!userId) {
    if (sourceId || sessionId) {
      throw new Error("Authentication required");
    }

    return {
      userId: null,
      sourceId: null,
      sessionId: null,
      properties,
    };
  }

  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const client = createSupabaseServerClient(accessToken);
  if (!client) {
    throw new Error("Supabase client is not configured.");
  }

  if (sourceId) {
    const { data: source, error: sourceError } = await client
      .from("study_sources")
      .select("id")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError) {
      throw new Error(`Unable to validate source reference (${sourceError.message})`);
    }

    if (!source) {
      throw new Error("You do not have permission to attach this source.");
    }
  }

  let validatedSessionSourceId: string | null = null;
  if (sessionId) {
    const { data: session, error: sessionError } = await client
      .from("study_sessions")
      .select("id, source_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(`Unable to validate session reference (${sessionError.message})`);
    }

    if (!session) {
      throw new Error("You do not have permission to attach this session.");
    }

    validatedSessionSourceId = typeof session.source_id === "string" ? session.source_id : null;
  }

  if (sourceId && validatedSessionSourceId && validatedSessionSourceId !== sourceId) {
    throw new Error("sourceId does not match the referenced session.");
  }

  return {
    userId,
    sourceId,
    sessionId,
    properties,
  };
}

export async function recordProductEvent(event: ProductEventRecord): Promise<void> {
  const context = getRequestContext();
  const accessToken = event.accessToken ?? context?.accessToken ?? null;
  const client = createSupabaseServerClient(accessToken);
  if (!client) {
    return;
  }

  const userId = event.userId ?? context?.userId ?? null;

  try {
    const { error } = await client.from("product_events").insert({
        user_id: userId,
        event_name: event.name,
        source_id: event.sourceId ?? null,
        session_id: event.sessionId ?? null,
        properties: sanitizeProperties(event.properties ?? {}),
      });

    if (error) {
      console.warn("[product-events] insert failed", {
        event: event.name,
        userId,
        message: error.message,
      });
    }
  } catch (error) {
    console.warn("[product-events] unexpected failure", {
      event: event.name,
      userId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
