type ApiErrorOptions = {
  code?: string;
  details?: unknown;
  headers?: HeadersInit;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  headers?: HeadersInit;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code ?? "unexpected_error";
    this.details = options.details;
    this.headers = options.headers;
  }
}

function errorJson(status: number, message: string, options: ApiErrorOptions = {}): Response {
  return Response.json(
    {
      error: message,
      code: options.code ?? "unexpected_error",
      ...(options.details !== undefined ? { details: options.details } : {}),
    },
    {
      status,
      headers: options.headers,
    },
  );
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string, options: ApiErrorOptions = {}): Response {
  return errorJson(400, message, { code: "bad_request", ...options });
}

export function unauthorized(message = "Authentication required", options: ApiErrorOptions = {}): Response {
  return errorJson(401, message, { code: "unauthorized", ...options });
}

export function forbidden(message = "Forbidden", options: ApiErrorOptions = {}): Response {
  return errorJson(403, message, { code: "forbidden", ...options });
}

export function notFound(message: string, options: ApiErrorOptions = {}): Response {
  return errorJson(404, message, { code: "not_found", ...options });
}

export function conflict(message: string, options: ApiErrorOptions = {}): Response {
  return errorJson(409, message, { code: "conflict", ...options });
}

export function tooManyRequests(message: string, options: ApiErrorOptions = {}): Response {
  return errorJson(429, message, { code: "rate_limited", ...options });
}

export function serviceUnavailable(message: string, options: ApiErrorOptions = {}): Response {
  return errorJson(503, message, { code: "service_unavailable", ...options });
}

export function methodNotAllowed(allowedMethods?: string[]): Response {
  return errorJson(405, "Method not allowed", {
    code: "method_not_allowed",
    headers: allowedMethods?.length ? { Allow: allowedMethods.join(", ") } : undefined,
    details: allowedMethods?.length ? { allowedMethods } : undefined,
  });
}

const NOT_FOUND_PATTERNS = [
  "Source not found",
  "Question not found",
  "Session not found",
];

const CONFLICT_PATTERNS = [
  "Session already ended",
  "Submitted question does not match current session position",
  "Retry was not expected for this question",
  "No active questions available. Add material first.",
];

const BAD_REQUEST_PATTERNS = [
  "Invalid JSON",
  "Unexpected end of JSON input",
  "Source content is too short",
  "Question prompt and answer are required",
  "CSV mapping could not be determined",
  "CSV mapping is required",
  "Unable to auto-detect delimiting character",
  "Too many fields",
  "Too few fields",
  "Quoted field unterminated",
  "FieldMismatch",
];

const SERVICE_UNAVAILABLE_PATTERNS = [
  "Snaplet persistence is unavailable",
  "Progress is temporarily unavailable",
  "Progress data is temporarily unavailable",
  "Public sharing is temporarily unavailable",
];

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", { code: "invalid_json" });
  }

  if (!isPlainObject(parsed)) {
    throw new ApiError(400, "Request body must be a JSON object.", { code: "invalid_json_shape" });
  }

  return parsed;
}

export function assertOptionalString(
  value: unknown,
  field: string,
  options: { maxLength?: number; allowEmpty?: boolean; nullable?: boolean } = {},
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    if (options.nullable) {
      return null;
    }
    throw new ApiError(400, `${field} must be a string.`, { code: "invalid_field_type" });
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be a string.`, { code: "invalid_field_type" });
  }

  const trimmed = value.trim();
  if (!options.allowEmpty && trimmed.length === 0) {
    throw new ApiError(400, `${field} cannot be empty.`, { code: "invalid_field_value" });
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new ApiError(400, `${field} is too long.`, {
      code: "field_too_long",
      details: { field, maxLength: options.maxLength },
    });
  }

  return trimmed;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return errorJson(error.status, error.message, {
      code: error.code,
      details: error.details,
      headers: error.headers,
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  if (message.includes("Authentication required")) {
    return unauthorized(message);
  }

  if (NOT_FOUND_PATTERNS.some((pattern) => message.includes(pattern))) {
    return notFound(message);
  }

  if (CONFLICT_PATTERNS.some((pattern) => message.includes(pattern))) {
    return conflict(message);
  }

  if (BAD_REQUEST_PATTERNS.some((pattern) => message.includes(pattern))) {
    return badRequest(message);
  }

  if (SERVICE_UNAVAILABLE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return serviceUnavailable(message);
  }

  return errorJson(500, message, { code: "internal_error" });
}

export function serverError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return errorJson(500, message, { code: "internal_error" });
}
