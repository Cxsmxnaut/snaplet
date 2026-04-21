import { createSupabaseAdminClient } from "./supabase-server.js";
import type { Question, StudySource } from "../domain/types.js";

type PublishedSourceRow = {
  source_id: string;
  owner_user_id: string;
  title: string;
  kind: StudySource["kind"];
  question_count: number;
  created_at: string;
  updated_at: string;
  published_at: string;
};

type PublishedQuestionRow = {
  id: string;
  source_id: string;
  prompt: string;
  answer: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function isMissingRelationError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.message?.includes("published_sources") === true ||
    error.message?.includes("published_questions") === true
  );
}

function toPublishedSnapshotError(
  stage: "source" | "question_cleanup" | "questions",
  error: { code?: string | null; message?: string | null },
): Error {
  if (isMissingRelationError(error)) {
    return new Error(
      "Public sharing is temporarily unavailable until the published snapshot migration is applied.",
    );
  }

  if (stage === "source") {
    return new Error(`Published source snapshot failed (${error.message})`);
  }

  if (stage === "question_cleanup") {
    return new Error(`Published question cleanup failed (${error.message})`);
  }

  return new Error(`Published questions snapshot failed (${error.message})`);
}

export async function removePublishedSourceSnapshot(sourceId: string): Promise<void> {
  const client = createSupabaseAdminClient();
  if (!client) {
    return;
  }

  const { error } = await client.from("published_sources").delete().eq("source_id", sourceId);
  if (error) {
    throw toPublishedSnapshotError("source", error);
  }
}

export async function syncPublishedSourceSnapshot(
  source: StudySource,
  questions: Question[],
): Promise<void> {
  const client = createSupabaseAdminClient();
  if (!client) {
    return;
  }

  if (source.visibility !== "public") {
    await removePublishedSourceSnapshot(source.id);
    return;
  }

  const publishedAt = new Date().toISOString();
  const sourceRow: PublishedSourceRow = {
    source_id: source.id,
    owner_user_id: source.userId,
    title: source.title,
    kind: source.kind,
    question_count: questions.length,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
    published_at: publishedAt,
  };

  const { error: sourceError } = await client.from("published_sources").upsert(sourceRow, {
    onConflict: "source_id",
  });

  if (sourceError) {
    throw toPublishedSnapshotError("source", sourceError);
  }

  const { error: deleteError } = await client.from("published_questions").delete().eq("source_id", source.id);
  if (deleteError) {
    throw toPublishedSnapshotError("question_cleanup", deleteError);
  }

  const activeQuestions = questions.filter((question) => question.status === "active");
  if (activeQuestions.length === 0) {
    return;
  }

  const questionRows: PublishedQuestionRow[] = activeQuestions.map((question, index) => ({
    id: question.id,
    source_id: source.id,
    prompt: question.prompt,
    answer: question.answer,
    position: index,
    created_at: question.createdAt,
    updated_at: question.updatedAt,
  }));

  const { error: questionError } = await client.from("published_questions").insert(questionRows);
  if (questionError) {
    throw toPublishedSnapshotError("questions", questionError);
  }
}
