"use client";

import * as pdfjs from "pdfjs-dist";

// Bundler-resolved worker URL (no CDN, keeps everything local/offline).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface TextItemLike {
  str: string;
  transform: number[]; // [a, b, c, d, e, f]; f = y, e = x
}

/**
 * Extract text from a PDF, grouped into visual lines.
 * Items sharing (approximately) the same y are one line, ordered by x.
 */
export async function extractLines(file: File | ArrayBuffer): Promise<string[]> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as unknown as TextItemLike[];

    const rows = new Map<number, TextItemLike[]>();
    for (const it of items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      const bucket = rows.get(y) ?? [];
      bucket.push(it);
      rows.set(y, bucket);
    }

    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rows.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
      const text = row.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
      if (text) lines.push(text);
    }
  }
  return lines;
}
