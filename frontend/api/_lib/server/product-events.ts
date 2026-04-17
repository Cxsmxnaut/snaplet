import type { ProductEventName } from "../../../shared/product-events.js";
import { getRequestContext } from "./request-context.js";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase-server.js";

type ProductEventRecord = {
  name: ProductEventName;
  userId?: string | null;
  accessToken?: string | null;
  sourceId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
};

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

export async function recordProductEvent(event: ProductEventRecord): Promise<void> {
  const context = getRequestContext();
  const client =
    createSupabaseAdminClient() ?? createSupabaseServerClient(event.accessToken ?? context?.accessToken ?? null);
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
