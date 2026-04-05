export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function serverError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json({ error: message }, { status: 500 });
}
