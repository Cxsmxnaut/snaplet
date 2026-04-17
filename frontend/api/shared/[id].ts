import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSupabaseServerClient } from "../_lib/server/supabase-server.js";
import { badRequest, methodNotAllowed, notFound, serverError } from "../_lib/server/http.js";
import { requireParam, sendWebResponse } from "../_lib/vercel-bridge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendWebResponse(methodNotAllowed(), res);
    }

    const id = requireParam(req.query.id);
    if (!id) {
      return sendWebResponse(badRequest("Missing source id."), res);
    }

    const supabase = createSupabaseServerClient(null);
    if (!supabase) {
      return sendWebResponse(serverError("Supabase client is not configured."), res);
    }

    const { data: source, error: sourceError } = await supabase
      .from("published_sources")
      .select("source_id,title,kind,question_count,created_at,updated_at,published_at")
      .eq("source_id", id)
      .single();

    if (sourceError?.code === "42P01") {
      return sendWebResponse(
        Response.json(
          { error: "Public sharing is temporarily unavailable while published snapshots are being configured." },
          { status: 503 },
        ),
        res,
      );
    }

    if (sourceError || !source) {
      return sendWebResponse(notFound("Shared kit not found."), res);
    }

    const { data: questions, error: questionError } = await supabase
      .from("published_questions")
      .select("id,source_id,prompt,answer,position,created_at,updated_at")
      .eq("source_id", id)
      .order("position", { ascending: true });

    if (questionError?.code === "42P01") {
      return sendWebResponse(
        Response.json(
          { error: "Public sharing is temporarily unavailable while published snapshots are being configured." },
          { status: 503 },
        ),
        res,
      );
    }

    if (questionError) {
      return sendWebResponse(serverError(questionError.message), res);
    }

    return sendWebResponse(
      Response.json({
        source: {
          id: source.source_id,
          title: source.title,
          kind: source.kind,
          visibility: "public",
          extractionStatus: "ready",
          questionGenerationStatus: "ready",
          questionCount: source.question_count,
          createdAt: source.created_at,
          updatedAt: source.updated_at,
          publishedAt: source.published_at,
        },
        questions: (questions ?? []).map((question) => ({
          id: question.id,
          sourceId: question.source_id,
          prompt: question.prompt,
          answer: question.answer,
          status: "active",
          createdAt: question.created_at,
          updatedAt: question.updated_at,
        })),
      }),
      res,
    );
  } catch (error) {
    return sendWebResponse(serverError(error), res);
  }
}
