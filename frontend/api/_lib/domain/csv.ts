import Papa from "papaparse";
import { type CSVMapping, type CSVPreviewRow } from "../domain/types";

const PROMPT_KEYS = ["prompt", "question", "term", "front"];
const ANSWER_KEYS = ["answer", "definition", "back", "translation"];

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseCsv(csvText: string): Array<Record<string, string>> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }

  return parsed.data
    .map((row) =>
      Object.fromEntries(
        Object.entries(row)
          .map(([key, value]) => [key, String(value ?? "").trim()])
          .filter(([, value]) => value.length > 0),
      ),
    )
    .filter((row) => Object.keys(row).length > 0);
}

export function suggestCsvMapping(rows: Array<Record<string, string>>): CSVMapping | null {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));

  const promptColumn = PROMPT_KEYS.find((candidate) => keys.has(candidate));
  const answerColumn = ANSWER_KEYS.find((candidate) => keys.has(candidate));

  if (!promptColumn || !answerColumn) {
    const [first, second] = Array.from(keys);
    if (!first || !second) {
      return null;
    }

    return {
      promptColumn: first,
      answerColumn: second,
    };
  }

  return {
    promptColumn,
    answerColumn,
  };
}

export function toPreviewRows(rows: Array<Record<string, string>>): CSVPreviewRow[] {
  return rows.slice(0, 20).map((row, index) => ({
    rowNumber: index + 1,
    values: row,
  }));
}

export function mapCsvRows(
  rows: Array<Record<string, string>>,
  mapping: CSVMapping,
): Array<{ prompt: string; answer: string }> {
  return rows
    .map((row) => ({
      prompt: row[mapping.promptColumn]?.trim() ?? "",
      answer: row[mapping.answerColumn]?.trim() ?? "",
    }))
    .filter((row) => row.prompt.length > 1 && row.answer.length > 0);
}
