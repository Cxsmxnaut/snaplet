import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./_lib/server/supabase-server.js";
import { methodNotAllowed, ok, serviceUnavailable } from "./_lib/server/http.js";
import { sendWebResponse } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return sendWebResponse(methodNotAllowed(["GET"]), res);
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    const fallbackClient = createSupabaseServerClient();
    if (fallbackClient) {
      return sendWebResponse(
        ok(
          {
            status: "ready",
            mode: "degraded",
            timestamp: new Date().toISOString(),
          },
          200,
        ),
        res,
      );
    }

    return sendWebResponse(serviceUnavailable("Supabase admin client is not configured."), res);
  }

  try {
    const { error } = await client.from("study_sources").select("id", { head: true, count: "exact" }).limit(1);
    if (error) {
      throw new Error(error.message);
    }

    return sendWebResponse(
      ok(
        {
          status: "ready",
          timestamp: new Date().toISOString(),
        },
        200,
      ),
      res,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Readiness check failed.";
    return sendWebResponse(serviceUnavailable(message), res);
  }
}
