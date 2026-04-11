export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message: string): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function conflict(message: string): Response {
  return Response.json({ error: message }, { status: 409 });
}

export function methodNotAllowed(message = "Method not allowed"): Response {
  return Response.json({ error: message }, { status: 405 });
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

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error";

  if (NOT_FOUND_PATTERNS.some((pattern) => message.includes(pattern))) {
    return notFound(message);
  }

  if (CONFLICT_PATTERNS.some((pattern) => message.includes(pattern))) {
    return conflict(message);
  }

  if (BAD_REQUEST_PATTERNS.some((pattern) => message.includes(pattern))) {
    return badRequest(message);
  }

  return Response.json({ error: message }, { status: 500 });
}

export function serverError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json({ error: message }, { status: 500 });
}
