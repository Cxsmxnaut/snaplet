import { generateQuestionPairsWithProviderMetadata, generateTitleWithProviders } from "../server/generation-providers.js";

export type QuestionGenerationResult = {
  pairs: Array<{ prompt: string; answer: string }>;
  provenance: "provider" | "heuristic";
  provider: string | null;
};

function linePairs(text: string): Array<{ prompt: string; answer: string }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const separator = line.includes(":") ? ":" : line.includes("-") ? "-" : null;
      if (!separator) {
        return [];
      }

      const [left, ...rest] = line.split(separator);
      const right = rest.join(separator).trim();
      if (!left || !right) {
        return [];
      }

      return [
        {
          prompt: `What matches: ${left.trim()}?`,
          answer: right,
        },
      ];
    });
}

function sentencePairs(text: string): Array<{ prompt: string; answer: string }> {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);

  return sentences.slice(0, 14).map((sentence) => {
    const words = sentence.split(/\s+/);
    const answerIndex = Math.max(1, Math.floor(words.length / 3));
    const answer = words[answerIndex]?.replace(/[^\p{L}\p{N}\-']/gu, "") ?? "";
    const promptWords = [...words];
    if (answer) {
      promptWords[answerIndex] = "_____";
    }

    return {
      prompt: `Fill the blank: ${promptWords.join(" ")}`,
      answer,
    };
  });
}

export async function generateQuestionPairs(sourceText: string): Promise<QuestionGenerationResult> {
  const providerResult = await generateQuestionPairsWithProviderMetadata(sourceText);
  if (providerResult.pairs && providerResult.pairs.length > 0) {
    return {
      pairs: providerResult.pairs.slice(0, 24),
      provenance: "provider",
      provider: providerResult.provider,
    };
  }

  const heuristicPairs = [...linePairs(sourceText), ...sentencePairs(sourceText)]
    .filter((pair) => pair.answer.length > 1)
    .slice(0, 20);

  return {
    pairs: heuristicPairs,
    provenance: "heuristic",
    provider: providerResult.provider,
  };
}

function fallbackTitle(sourceText: string): string {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0] ?? "";

  if (first.length >= 4) {
    return first
      .replace(/[^\p{L}\p{N}\s:'-]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 64);
  }

  const words = sourceText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 4);

  if (words.length === 0) {
    return "Untitled Study Kit";
  }

  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export async function generateStudyTitle(sourceText: string): Promise<string> {
  const generatedTitle = await generateTitleWithProviders(sourceText);
  if (generatedTitle) {
    return generatedTitle;
  }

  return fallbackTitle(sourceText);
}
