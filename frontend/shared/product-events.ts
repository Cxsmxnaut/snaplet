export const PRODUCT_EVENT_NAMES = [
  "auth_viewed",
  "auth_oauth_started",
  "auth_password_submitted",
  "auth_signed_in",
  "auth_signed_up",
  "auth_reset_requested",
  "auth_signed_out",
  "source_create_started",
  "source_create_succeeded",
  "source_create_failed",
  "upload_started",
  "upload_succeeded",
  "upload_failed",
  "generation_succeeded",
  "generation_failed",
  "session_started",
  "session_completed",
  "session_quit",
  "weak_review_opened",
  "recommended_review_opened",
  "progress_load_failed",
  "provider_failure",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export type ProductEventPayload = {
  name: ProductEventName;
  sourceId?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
};

export function isProductEventName(value: string): value is ProductEventName {
  return PRODUCT_EVENT_NAMES.includes(value as ProductEventName);
}
