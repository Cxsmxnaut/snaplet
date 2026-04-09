import { type AttemptEvaluation } from "../domain/types.js";
import {
  damerauLevenshtein,
  normalizeForCompare,
  similarityScore,
  stripDiacritics,
  toGraphemes,
} from "../domain/normalize.js";

const MIN_SIMILARITY = 0.88;
const TOKEN_SYNONYM_GROUPS: string[][] = [
  ["movement", "transport"],
  ["passive", "spontaneous"],
  ["active", "atp-dependent", "energy-requiring"],
  ["energy", "atp"],
];

function tokenize(value: string): string[] {
  return normalizeForCompare(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function tokenMatches(answerToken: string, canonicalToken: string): boolean {
  if (answerToken === canonicalToken) {
    return true;
  }

  for (const group of TOKEN_SYNONYM_GROUPS) {
    if (group.includes(answerToken) && group.includes(canonicalToken)) {
      return true;
    }
  }

  return false;
}

function typoThreshold(graphemeLength: number): number {
  if (graphemeLength <= 6) {
    return 1;
  }

  if (graphemeLength <= 12) {
    return 2;
  }

  return 3;
}

export function evaluateAnswer(answer: string, canonical: string): AttemptEvaluation {
  const normalizedAnswer = normalizeForCompare(answer);
  const normalizedCanonical = normalizeForCompare(canonical);

  if (normalizedAnswer === normalizedCanonical) {
    return {
      outcome: "exact",
      normalizedAnswer,
      normalizedCanonical,
      editDistance: 0,
      similarity: 1,
    };
  }

  const answerBase = stripDiacritics(normalizedAnswer);
  const canonicalBase = stripDiacritics(normalizedCanonical);

  if (answerBase === canonicalBase) {
    return {
      outcome: "accent_near",
      normalizedAnswer,
      normalizedCanonical,
      editDistance: 1,
      similarity: 0.99,
    };
  }

  const answerGraphemes = toGraphemes(normalizedAnswer);
  const canonicalGraphemes = toGraphemes(normalizedCanonical);
  const distance = damerauLevenshtein(answerGraphemes, canonicalGraphemes);
  const maxLength = Math.max(answerGraphemes.length, canonicalGraphemes.length);
  const similarity = similarityScore(distance, maxLength);

  if (distance <= typoThreshold(canonicalGraphemes.length) && similarity >= MIN_SIMILARITY) {
    return {
      outcome: "typo_near",
      normalizedAnswer,
      normalizedCanonical,
      editDistance: distance,
      similarity,
    };
  }

  return {
    outcome: "incorrect",
    normalizedAnswer,
    normalizedCanonical,
    editDistance: distance,
    similarity,
  };
}

export function isLexicalSemanticEquivalent(answer: string, canonical: string): boolean {
  const canonicalTokens = tokenize(canonical);
  const answerTokens = tokenize(answer);
  if (canonicalTokens.length === 0 || answerTokens.length === 0) {
    return false;
  }

  // Conservative fallback: only for short canonical answers where each canonical token
  // is present directly or through a known synonym in the user's sentence.
  if (canonicalTokens.length > 4) {
    return false;
  }

  return canonicalTokens.every((canonicalToken) =>
    answerTokens.some((answerToken) => tokenMatches(answerToken, canonicalToken)),
  );
}

export function isCorrectOutcome(outcome: AttemptEvaluation["outcome"]): boolean {
  return outcome === "exact" || outcome === "accent_near" || outcome === "correct_after_retry";
}
