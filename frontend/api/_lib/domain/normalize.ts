const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("und", { granularity: "grapheme" })
    : null;

export function normalizeForCompare(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

export function toGraphemes(input: string): string[] {
  if (!graphemeSegmenter) {
    return Array.from(input);
  }

  return Array.from(graphemeSegmenter.segment(input), (chunk) => chunk.segment);
}

export function damerauLevenshtein(a: string[], b: string[]): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = Array.from({ length: aLen + 1 }, () =>
    Array.from({ length: bLen + 1 }, () => 0),
  );

  for (let i = 0; i <= aLen; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= bLen; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[aLen][bLen];
}

export function similarityScore(distance: number, maxLength: number): number {
  if (maxLength === 0) {
    return 1;
  }

  return Math.max(0, 1 - distance / maxLength);
}
