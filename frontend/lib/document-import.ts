import { DESCRIPTION_MAX_LENGTH } from "./assessment";

/**
 * Document import for the describe step (SCRUM-23).
 *
 * Files are read and parsed entirely in the browser: nothing is uploaded,
 * which keeps the promise made in docs/data-handling.md. The parsers are
 * loaded on demand so they stay out of the initial bundle.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Kind = "text" | "pdf" | "docx";

const BY_EXTENSION: Record<string, Kind> = {
  txt: "text",
  md: "text",
  csv: "text",
  pdf: "pdf",
  docx: "docx",
};

/** What the file picker offers, and what the drop zone accepts. */
export const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.csv";
export const ACCEPTED_LABEL = "PDF, Word (.docx), or text";

export class DocumentImportError extends Error {}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function kindFor(file: File): Kind {
  const kind = BY_EXTENSION[extensionOf(file.name)];
  if (!kind) {
    throw new DocumentImportError(
      `That file type is not supported. Upload ${ACCEPTED_LABEL}.`,
    );
  }
  return kind;
}

/** Collapses runs of whitespace so extracted text reads as prose. */
export function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ImportedDocument = {
  fileName: string;
  text: string;
  truncated: boolean;
  /** Characters extracted before any truncation, for the user-facing note. */
  extractedLength: number;
};

/**
 * pdf.js needs a worker script. In the app the bundler emits this asset and
 * rewrites the URL; tests pass an explicit path instead, because the test
 * runner resolves `import.meta.url` to an http origin it cannot import.
 */
export function defaultPdfWorkerSrc(): string {
  return new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
}

/**
 * pdf.js 6 calls `Promise.try`, which only landed in Chrome 128, Safari 18.2,
 * Firefox 134 and Node 23. Clients open this in whatever browser their IT
 * gives them, and CI runs Node 22, so provide the standard behaviour where it
 * is missing rather than pinning pdf.js to a release with a known RCE
 * (CVE-2024-4367, fixed in 4.2).
 */
function ensurePromiseTry(): void {
  const target = Promise as unknown as {
    try?: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown>;
  };
  if (typeof target.try === "function") return;
  // A synchronous throw inside the executor rejects the promise, which is the
  // behaviour Promise.try specifies.
  target.try = (fn, ...args) => new Promise((resolve) => resolve(fn(...args)));
}

async function readPdf(file: File, pdfWorkerSrc?: string): Promise<string> {
  ensurePromiseTry();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc ?? defaultPdfWorkerSrc();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, useWorkerFetch: false });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}

async function readDocx(file: File): Promise<string> {
  // Declared in types/mammoth-browser.d.ts; the browser build keeps parsing local.
  const mammoth = await import("mammoth/mammoth.browser");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/**
 * Reads a file and returns text ready for the description field. Throws a
 * DocumentImportError with a message meant for the person, not a log.
 */
export async function extractDocumentText(
  file: File,
  options: { pdfWorkerSrc?: string } = {},
): Promise<ImportedDocument> {
  const kind = kindFor(file);

  if (file.size === 0) {
    throw new DocumentImportError("That file is empty. Try another one, or type the description instead.");
  }
  if (file.size > MAX_FILE_BYTES) {
    const limit = Math.round(MAX_FILE_BYTES / (1024 * 1024));
    throw new DocumentImportError(`That file is larger than ${limit} MB. Upload a smaller one, or paste the relevant part.`);
  }

  let raw: string;
  try {
    if (kind === "pdf") raw = await readPdf(file, options.pdfWorkerSrc);
    else if (kind === "docx") raw = await readDocx(file);
    else raw = await file.text();
  } catch {
    // Never surface the parser's own error: it can quote file contents.
    throw new DocumentImportError("That file could not be read. It may be protected or damaged—try another, or type the description instead.");
  }

  const text = tidy(raw);
  if (!text) {
    throw new DocumentImportError(
      kind === "pdf"
        ? "No text could be read from that PDF. Scanned documents are not supported yet—type the description instead."
        : "No text could be read from that file. Type the description instead.",
    );
  }

  const truncated = text.length > DESCRIPTION_MAX_LENGTH;
  return {
    fileName: file.name,
    text: truncated ? text.slice(0, DESCRIPTION_MAX_LENGTH) : text,
    truncated,
    extractedLength: text.length,
  };
}
