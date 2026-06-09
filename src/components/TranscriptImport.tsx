"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { extractLines as defaultExtract } from "@/lib/pdf-text";
import { parseTranscript, type ParsedTranscript } from "@/lib/transcript-parser";

interface Props {
  onImport: (result: ParsedTranscript) => void;
  /** Injectable for tests; defaults to the real pdf.js extractor. */
  extractLinesFn?: (file: File) => Promise<string[]>;
}

export function TranscriptImport({ onImport, extractLinesFn = defaultExtract }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const lines = await extractLinesFn(file);
      const result = parseTranscript(lines);
      onImport(result);
      const parts = [`Imported ${result.completed.length} completed, ${result.inProgress.length} in-progress`];
      if (result.program) parts.push(`(${result.program})`);
      setStatus(parts.join(" "));
      if (result.warnings.length) setError(result.warnings.join(" "));
    } catch {
      setError("Couldn't read this PDF. Make sure it's the NEU Unofficial Academic Transcript.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Import from transcript</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Upload your NEU Unofficial Academic Transcript PDF. It is processed entirely in your
        browser — never uploaded to a server — and saved only in this browser.
      </p>
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-red-600 hover:text-red-700">
        <Upload className="w-4 h-4" />
        <span>Choose transcript PDF</span>
        <input
          aria-label="Transcript PDF"
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {busy && <p className="text-sm text-slate-400 mt-2">Reading…</p>}
      {status && <p className="text-sm text-green-600 dark:text-green-400 mt-2">{status}</p>}
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">{error}</p>}
    </div>
  );
}
