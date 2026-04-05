import mammoth from "mammoth";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ExtractionResult {
  text: string;
  qualityScore: number;
  status: "ready" | "needs_attention" | "failed";
  parserPath: string;
  ocrUsed: boolean;
  errorDetails?: string;
}

function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function qualityScore(input: string): number {
  if (!input) {
    return 0;
  }

  const words = input.split(/\s+/).filter(Boolean);
  const uniqueChars = new Set(Array.from(input.replace(/\s+/g, ""))).size;
  const charCount = input.replace(/\s+/g, "").length;

  const density = Math.min(1, words.length / 120);
  const diversity = Math.min(1, uniqueChars / 50);
  const lengthFactor = Math.min(1, charCount / 600);

  return Number((density * 0.5 + diversity * 0.2 + lengthFactor * 0.3).toFixed(3));
}

async function extractPdfText(fileBytes: Uint8Array): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(Buffer.from(fileBytes));
  return result.text ?? "";
}

async function extractDocxText(fileBytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(fileBytes),
  });

  return result.value ?? "";
}

function extractPlainText(fileBytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
}

async function extractPdfTextWithOcrSpace(
  fileBytes: Uint8Array,
  fileName: string,
): Promise<string | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const formData = new FormData();
  const blob = new Blob([Buffer.from(fileBytes)], { type: "application/pdf" });
  formData.append("file", blob, fileName || "upload.pdf");
  formData.append("language", "auto");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string[] | string;
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (payload.IsErroredOnProcessing) {
      return null;
    }

    const text = (payload.ParsedResults ?? [])
      .map((result) => (result.ParsedText ?? "").trim())
      .filter(Boolean)
      .join("\n\n");

    return text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function hasBinary(binary: string): Promise<boolean> {
  try {
    await execFileAsync("which", [binary]);
    return true;
  } catch {
    return false;
  }
}

async function extractPdfTextWithLocalTesseract(fileBytes: Uint8Array): Promise<string | null> {
  const hasPdftoppm = await hasBinary("pdftoppm");
  const hasTesseract = await hasBinary("tesseract");
  if (!hasPdftoppm || !hasTesseract) {
    return null;
  }

  const lang = process.env.TESSERACT_LANG ?? "eng";
  const workdir = await mkdtemp(join(tmpdir(), "snaplet-ocr-"));
  const pdfPath = join(workdir, "input.pdf");
  const imagePrefix = join(workdir, "page");

  try {
    await writeFile(pdfPath, Buffer.from(fileBytes));

    // Convert first few pages to images to cap runtime for low-power machines.
    await execFileAsync("pdftoppm", ["-png", "-f", "1", "-l", "5", pdfPath, imagePrefix], {
      maxBuffer: 8 * 1024 * 1024,
    });

    const files = await readdir(workdir);
    const pageImages = files
      .filter((name) => name.startsWith("page-") && name.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (pageImages.length === 0) {
      return null;
    }

    const chunks: string[] = [];
    for (const imageName of pageImages) {
      const imagePath = join(workdir, imageName);
      const outputBase = imagePath.replace(/\.png$/i, "");

      await execFileAsync(
        "tesseract",
        [imagePath, outputBase, "-l", lang, "--psm", "6"],
        { maxBuffer: 8 * 1024 * 1024 },
      );

      const txtPath = `${outputBase}.txt`;
      const text = (await readFile(txtPath, "utf8")).trim();
      if (text) {
        chunks.push(text);
      }
    }

    if (chunks.length === 0) {
      return null;
    }

    return chunks.join("\n\n");
  } catch {
    return null;
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

export async function extractTextFromUpload(
  fileName: string,
  mimeType: string,
  fileBytes: Uint8Array,
): Promise<ExtractionResult> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const startedAt = Date.now();

  try {
    let parserPath = "plain";
    let extracted = "";

    if (extension === "pdf" || mimeType === "application/pdf") {
      parserPath = "pdf_text_layer";
      extracted = await extractPdfText(fileBytes);
    } else if (
      extension === "docx" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      parserPath = "docx_mammoth";
      extracted = await extractDocxText(fileBytes);
    } else if (extension === "txt" || extension === "md" || mimeType.startsWith("text/")) {
      parserPath = "text_decoder";
      extracted = extractPlainText(fileBytes);
    } else {
      return {
        text: "",
        qualityScore: 0,
        status: "failed",
        parserPath: "unsupported",
        ocrUsed: false,
        errorDetails: "Unsupported file type",
      };
    }

    extracted = normalizeExtractedText(extracted);
    let score = qualityScore(extracted);
    let ocrUsed = false;

    if ((extension === "pdf" || mimeType === "application/pdf") && score < 0.22) {
      const ocrText = await extractPdfTextWithOcrSpace(fileBytes, fileName);
      if (ocrText) {
        const normalizedOcrText = normalizeExtractedText(ocrText);
        const ocrScore = qualityScore(normalizedOcrText);
        if (ocrScore > score) {
          extracted = normalizedOcrText;
          score = ocrScore;
          ocrUsed = true;
          parserPath = "pdf_text_layer+ocr_space";
        }
      }
    }

    if ((extension === "pdf" || mimeType === "application/pdf") && score < 0.22) {
      const localOcrText = await extractPdfTextWithLocalTesseract(fileBytes);
      if (localOcrText) {
        const normalizedLocalText = normalizeExtractedText(localOcrText);
        const localScore = qualityScore(normalizedLocalText);
        if (localScore > score) {
          extracted = normalizedLocalText;
          score = localScore;
          ocrUsed = true;
          parserPath = "pdf_text_layer+local_tesseract";
        }
      }
    }

    const status = score >= 0.22 ? "ready" : "needs_attention";
    void startedAt;

    return {
      text: extracted,
      qualityScore: score,
      status,
      parserPath,
      ocrUsed,
    };
  } catch (error) {
    return {
      text: "",
      qualityScore: 0,
      status: "failed",
      parserPath: "error",
      ocrUsed: false,
      errorDetails: error instanceof Error ? error.message : "Unknown extraction failure",
    };
  }
}
