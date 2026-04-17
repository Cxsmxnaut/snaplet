import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, ok, serverError } from "./_lib/server/http.js";
import { createSupabaseAdminClient } from "./_lib/server/supabase-server.js";
import { sendWebResponse } from "./_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return sendWebResponse(methodNotAllowed(), res);
  }

  try {
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return sendWebResponse(ok({ userCount: null }), res);
    }

    const { count, error } = await supabase.schema("auth").from("users").select("id", {
      count: "exact",
      head: true,
    });

    if (error) {
      throw error;
    }

    const userCount = typeof count === "number" ? count : null;

    return sendWebResponse(ok({ userCount }), res);
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
