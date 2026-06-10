# Transcript Import → Auto-fill Graduation Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a student upload their NEU Unofficial Academic Transcript PDF and have the graduation planner auto-populate completed courses, in-progress courses, and the degree program — all parsed in-browser, persisted to localStorage, with zero server involvement.

**Architecture:** Three units with clean boundaries — a pure text parser (`transcript-parser.ts`, no I/O, fully unit-tested), a thin pdf.js adapter (`pdf-text.ts`, the only PDF dependency), and an import UI component (`TranscriptImport.tsx`). The parser output maps onto the existing `CompletedCourse`/`PlannedCourse` types and feeds the unchanged `analyzeGraduation()` engine. `RequirementChecker.tsx` gains the import button + localStorage persistence.

**Tech Stack:** Next.js 16.2.1 (App Router, client components), React 19, TypeScript, `pdfjs-dist`, Vitest + @testing-library/react, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-06-06-transcript-import-design.md`

---

## File Structure

| File | Responsibility | New/Modify |
|---|---|---|
| `src/lib/transcript-parser.ts` | Pure: `string[]` lines → `ParsedTranscript`. Section state machine, term/program mapping, title rejoin. | Create |
| `src/lib/pdf-text.ts` | `pdfjs-dist` adapter: `File`/`ArrayBuffer` → `string[]` lines grouped by y-coordinate. | Create |
| `src/components/TranscriptImport.tsx` | File picker UI; extract→parse→`onImport(result)`; status/warnings/errors. | Create |
| `src/components/RequirementChecker.tsx` | Render `<TranscriptImport>`, apply import to state, localStorage persistence + hydration. | Modify |
| `__tests__/lib/transcript-parser.test.ts` | Unit tests against real-transcript-derived fixtures. | Create |
| `__tests__/components/TranscriptImport.test.tsx` | Component test: file select → onImport mapping, error path. | Create |
| `package.json` | Add `pdfjs-dist` dependency. | Modify |

The `ParsedTranscript` type and helper functions live in `transcript-parser.ts` and are imported elsewhere. No changes to `src/lib/types.ts` or `src/lib/requirements.ts`.

---

## Task 1: Term & program mapping helpers (pure)

**Files:**
- Create: `src/lib/transcript-parser.ts`
- Test: `__tests__/lib/transcript-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/transcript-parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { termToCode, programToId } from "@/lib/transcript-parser";

describe("termToCode", () => {
  it("maps season + year to a Banner term code", () => {
    expect(termToCode("Fall 2024 Semester")).toBe("202430");
    expect(termToCode("Spring 2025 Semester")).toBe("202510");
    expect(termToCode("Summer Full 2025 Semester")).toBe("202550");
    expect(termToCode("Summer 2026 Semester")).toBe("202650");
    expect(termToCode("Summer 1 2025 Semester")).toBe("202550");
  });
  it("returns empty string for unrecognized terms", () => {
    expect(termToCode("Winter 2025")).toBe("");
    expect(termToCode("garbage")).toBe("");
  });
});

describe("programToId", () => {
  it("maps the Primary Program string to a ProgramId", () => {
    expect(programToId("M.S. in Computer Science")).toBe("MSCS");
    expect(programToId("M.S. in Artificial Intelligence")).toBe("MSAI");
    expect(programToId("M.S. in Data Science")).toBe("MSDS");
  });
  it("returns undefined for unrecognized programs", () => {
    expect(programToId("M.S. in Cybersecurity")).toBeUndefined();
    expect(programToId("")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/joshcho/Documents/claude_projects/neu-cs-tracker && npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/transcript-parser"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/transcript-parser.ts`:

```ts
import type { ProgramId } from "@/lib/requirements";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";

const SEASON_SUFFIX: Record<string, string> = {
  Spring: "10",
  Summer: "50",
  Fall: "30",
};

/** "Fall 2024 Semester" | "Summer Full 2025 Semester" -> "202430" | "202550" */
export function termToCode(term: string): string {
  const seasonMatch = term.match(/\b(Spring|Summer|Fall)\b/);
  const yearMatch = term.match(/\b(20\d{2})\b/);
  if (!seasonMatch || !yearMatch) return "";
  const suffix = SEASON_SUFFIX[seasonMatch[1]];
  if (!suffix) return "";
  return `${yearMatch[1]}${suffix}`;
}

const PROGRAM_MAP: Record<string, ProgramId> = {
  "m.s. in computer science": "MSCS",
  "m.s. in artificial intelligence": "MSAI",
  "m.s. in data science": "MSDS",
};

export function programToId(program: string): ProgramId | undefined {
  return PROGRAM_MAP[program.trim().toLowerCase()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: PASS (both describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcript-parser.ts __tests__/lib/transcript-parser.test.ts
git commit -m "feat(transcript): term and program mapping helpers"
```

---

## Task 2: Course-row parsing helpers (pure)

**Files:**
- Modify: `src/lib/transcript-parser.ts`
- Test: `__tests__/lib/transcript-parser.test.ts`

Recognize an institution-credit (graded) row and an in-progress (ungraded) row. Rows arrive as single rejoined lines (Task 3 handles rejoining).

- [ ] **Step 1: Write the failing test**

Append to `__tests__/lib/transcript-parser.test.ts`:

```ts
import { parseGradedRow, parseInProgressRow, isEarnedGrade } from "@/lib/transcript-parser";

describe("parseGradedRow", () => {
  it("parses a completed course row", () => {
    expect(parseGradedRow("CS 5010 GR Programming Design Paradigm A- 4.000 14.668", "202430"))
      .toEqual({ subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, term: "202430", grade: "A-" });
  });
  it("parses a single-grade-letter row", () => {
    expect(parseGradedRow("CS 5100 GR Fndtns Artificial Intelligence A 4.000 16.000", "202550"))
      .toEqual({ subject: "CS", courseNumber: "5100", title: "Fndtns Artificial Intelligence", credits: 4, term: "202550", grade: "A" });
  });
  it("returns null for a non-course line", () => {
    expect(parseGradedRow("Term Totals Attempt Hours Passed Hours", "202430")).toBeNull();
    expect(parseGradedRow("Academic Standing", "202430")).toBeNull();
  });
});

describe("parseInProgressRow", () => {
  it("parses an in-progress course row (no grade, no quality points)", () => {
    expect(parseInProgressRow("CS 5200 GR Database Management Sys 4.000", "202650"))
      .toEqual({ subject: "CS", courseNumber: "5200", title: "Database Management Sys", credits: 4, term: "202650" });
  });
  it("returns null for a non-course line", () => {
    expect(parseInProgressRow("Subject Course Level Title Credit Hours Start and End Dates", "202650")).toBeNull();
  });
});

describe("isEarnedGrade", () => {
  it("accepts earned grades", () => {
    ["A", "A-", "B+", "C", "S"].forEach((g) => expect(isEarnedGrade(g)).toBe(true));
  });
  it("rejects not-earned grades", () => {
    ["W", "I", "IP", "NF", "U", "L", "X"].forEach((g) => expect(isEarnedGrade(g)).toBe(false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: FAIL — `parseGradedRow is not a function` (import resolves, symbols missing).

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/transcript-parser.ts`:

```ts
const NOT_EARNED = new Set(["W", "I", "IP", "NF", "U", "L", "X"]);

/** True if a grade means the course was earned (counts toward the degree). */
export function isEarnedGrade(grade: string): boolean {
  return !NOT_EARNED.has(grade.trim().toUpperCase());
}

// Graded row: SUBJ NUM LEVEL <title...> GRADE CREDIT QUALITYPOINTS
// e.g. "CS 5010 GR Programming Design Paradigm A- 4.000 14.668"
const GRADED_ROW =
  /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+(.+?)\s+([A-F][+-]?|S|U|W|I|IP|NF|L|X|TR?)\s+(\d+\.\d{3})\s+(-?\d+\.\d{3})$/;

export function parseGradedRow(line: string, term: string): CompletedCourse | null {
  const m = line.trim().match(GRADED_ROW);
  if (!m) return null;
  return {
    subject: m[1],
    courseNumber: m[2],
    title: m[3].trim(),
    credits: Math.round(parseFloat(m[5])),
    term,
    grade: m[4],
  };
}

// In-progress row: SUBJ NUM LEVEL <title...> CREDIT   (no grade, no quality points)
// e.g. "CS 5200 GR Database Management Sys 4.000"
const IN_PROGRESS_ROW = /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+(.+?)\s+(\d+\.\d{3})$/;

export function parseInProgressRow(line: string, term: string): PlannedCourse | null {
  const m = line.trim().match(IN_PROGRESS_ROW);
  if (!m) return null;
  return {
    subject: m[1],
    courseNumber: m[2],
    title: m[3].trim(),
    credits: Math.round(parseFloat(m[4])),
    term,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: PASS (all blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcript-parser.ts __tests__/lib/transcript-parser.test.ts
git commit -m "feat(transcript): graded and in-progress row parsers"
```

---

## Task 3: Line rejoin + full `parseTranscript` state machine

**Files:**
- Modify: `src/lib/transcript-parser.ts`
- Test: `__tests__/lib/transcript-parser.test.ts`

This is the integration of Tasks 1–2: walk the lines, track section + current term, rejoin wrapped titles, classify rows. Wrapped titles mean a course row may be split across lines — the parser accumulates non-matching fragments and retries the regex with the fragment prepended.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/lib/transcript-parser.test.ts`. The fixture is derived from the user's real transcript (titles intentionally split across lines to exercise rejoining):

```ts
import { parseTranscript, type ParsedTranscript } from "@/lib/transcript-parser";

const REAL_TRANSCRIPT_LINES = [
  "Northeastern University",
  "Unofficial Academic Transcript",
  "STUDENT INFORMATION",
  "Name",
  "Jae Hun Cho",
  "Primary Program",
  "M.S. in Computer Science",
  "INSTITUTION CREDIT",
  "Term : Fall 2024 Semester",
  "Academic Standing",
  "Good Standing",
  "Subject Course Level Title Grade Credit Hours Quality Points Start and End Dates R CEU Contact Hours",
  "CS 5010 GR Programming Design",          // wrapped title line 1
  "Paradigm A- 4.000 14.668",               // wrapped title line 2 + grade/credits
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 14.668 3.667",
  "Term : Spring 2025 Semester",
  "Academic Standing",
  "Good Standing",
  "Subject Course Level Title Grade Credit Hours Quality Points Start and End Dates R CEU Contact Hours",
  "CS 5330 GR Pattern Recogn & Comput",
  "Vision A- 4.000 14.668",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 14.668 3.667",
  "Term : Summer Full 2025 Semester",       // NOTE: no Academic Standing line
  "Subject Course Level Title Grade Credit Hours Quality Points Start and End Dates R CEU Contact Hours",
  "CS 5100 GR Fndtns Artificial",
  "Intelligence A 4.000 16.000",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 16.000 4.000",
  "Term : Spring 2026 Semester",
  "Academic Standing",
  "Good Standing",
  "Subject Course Level Title Grade Credit Hours Quality Points Start and End Dates R CEU Contact Hours",
  "CS 6120 GR Natural Language",
  "Processing A 4.000 16.000",
  "CS 6140 GR Machine Learning A 4.000 16.000",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 8.000 8.000 8.000 8.000 32.000 4.000",
  "TRANSCRIPT TOTALS",
  "Total Institution 20.000 20.000 20.000 20.000 77.336 3.867",
  "COURSE(S) IN PROGRESS",
  "Term : Summer 2026 Semester",
  "Subject Course Level Title Credit Hours Start and End Dates",
  "CS 5200 GR Database Management Sys 4.000",
  "CS 5340 GR Computer/Human Interaction 4.000",
  "CS 5700 GR Fundamentals - Computer Netwkg 4.000",
];

describe("parseTranscript", () => {
  let r: ParsedTranscript;
  beforeAll(() => { r = parseTranscript(REAL_TRANSCRIPT_LINES); });

  it("detects the program", () => { expect(r.program).toBe("MSCS"); });

  it("parses 5 completed courses with rejoined titles", () => {
    expect(r.completed).toEqual([
      { subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, term: "202430", grade: "A-" },
      { subject: "CS", courseNumber: "5330", title: "Pattern Recogn & Comput Vision", credits: 4, term: "202510", grade: "A-" },
      { subject: "CS", courseNumber: "5100", title: "Fndtns Artificial Intelligence", credits: 4, term: "202550", grade: "A" },
      { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, term: "202610", grade: "A" },
      { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, term: "202610", grade: "A" },
    ]);
  });

  it("parses 3 in-progress courses", () => {
    expect(r.inProgress).toEqual([
      { subject: "CS", courseNumber: "5200", title: "Database Management Sys", credits: 4, term: "202650" },
      { subject: "CS", courseNumber: "5340", title: "Computer/Human Interaction", credits: 4, term: "202650" },
      { subject: "CS", courseNumber: "5700", title: "Fundamentals - Computer Netwkg", credits: 4, term: "202650" },
    ]);
  });

  it("emits no warnings for a clean transcript", () => { expect(r.warnings).toEqual([]); });
});

describe("parseTranscript edge cases", () => {
  it("skips not-earned grades (withdrawn)", () => {
    const lines = [
      "INSTITUTION CREDIT",
      "Term : Fall 2024 Semester",
      "Subject Course Level Title Grade Credit Hours Quality Points",
      "CS 5010 GR Programming Design Paradigm A- 4.000 14.668",
      "CS 5800 GR Algorithms W 0.000 0.000",
    ];
    const r = parseTranscript(lines);
    expect(r.completed).toHaveLength(1);
    expect(r.completed[0].courseNumber).toBe("5010");
  });

  it("returns empty arrays and a warning for non-transcript input", () => {
    const r = parseTranscript(["hello world", "not a transcript"]);
    expect(r.completed).toEqual([]);
    expect(r.inProgress).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: FAIL — `parseTranscript is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/transcript-parser.ts`:

```ts
export interface ParsedTranscript {
  program?: ProgramId;
  completed: CompletedCourse[];
  inProgress: PlannedCourse[];
  studentName?: string;
  warnings: string[];
}

type Section = "HEADER" | "INSTITUTION_CREDIT" | "TOTALS" | "IN_PROGRESS";

const TERM_HEADER = /^Term\s*:\s*(.+?)(?:\s+Semester)?$/;

export function parseTranscript(lines: string[]): ParsedTranscript {
  const result: ParsedTranscript = { completed: [], inProgress: [], warnings: [] };
  let section: Section = "HEADER";
  let term = "";
  let pending = ""; // accumulates wrapped-title fragments

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section transitions (checked before row parsing).
    if (line === "Primary Program") {
      const next = lines[i + 1]?.trim();
      if (next) result.program = programToId(next);
      continue;
    }
    if (line === "Name") {
      const next = lines[i + 1]?.trim();
      if (next) result.studentName = next;
      continue;
    }
    if (line.startsWith("INSTITUTION CREDIT")) { section = "INSTITUTION_CREDIT"; pending = ""; continue; }
    if (line.startsWith("TRANSCRIPT TOTALS")) { section = "TOTALS"; pending = ""; continue; }
    if (line.startsWith("COURSE(S) IN PROGRESS")) { section = "IN_PROGRESS"; pending = ""; continue; }

    const termMatch = line.match(TERM_HEADER);
    if (termMatch) {
      term = termToCode(termMatch[1]);
      if (!term) result.warnings.push(`Unrecognized term: "${termMatch[1]}"`);
      pending = "";
      continue;
    }

    // Reset pending on structural / totals lines.
    if (
      line.startsWith("Term Totals") ||
      line.startsWith("Current Term") ||
      line.startsWith("Cumulative") ||
      line.startsWith("Subject Course Level") ||
      line === "Academic Standing" ||
      line === "Good Standing" ||
      line.startsWith("Total ")
    ) {
      pending = "";
      continue;
    }

    if (section === "INSTITUTION_CREDIT" && term) {
      const candidate = pending ? `${pending} ${line}` : line;
      const row = parseGradedRow(candidate, term);
      if (row) {
        if (isEarnedGrade(row.grade ?? "")) result.completed.push(row);
        pending = "";
      } else if (/^[A-Z]{2,4}\s+\d{4}/.test(candidate)) {
        // looks like the start of a course row but title not yet complete — accumulate
        pending = candidate;
      } else {
        pending = "";
      }
    } else if (section === "IN_PROGRESS" && term) {
      const candidate = pending ? `${pending} ${line}` : line;
      const row = parseInProgressRow(candidate, term);
      if (row) {
        result.inProgress.push(row);
        pending = "";
      } else if (/^[A-Z]{2,4}\s+\d{4}/.test(candidate)) {
        pending = candidate;
      } else {
        pending = "";
      }
    }
  }

  if (result.completed.length === 0 && result.inProgress.length === 0) {
    result.warnings.push(
      "No courses recognized — is this the NEU Unofficial Academic Transcript PDF?"
    );
  }
  return result;
}
```

Add `beforeAll, beforeEach` to the test file's vitest import if not auto-global — globals are enabled in `vitest.config.mts`, so `beforeAll` is available without import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: PASS — 5 completed (titles rejoined), 3 in-progress, program MSCS, withdrawn row skipped, garbage → warning.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all previously-passing tests still pass, plus the new file.

- [ ] **Step 6: Commit**

```bash
git add src/lib/transcript-parser.ts __tests__/lib/transcript-parser.test.ts
git commit -m "feat(transcript): full parseTranscript state machine with title rejoin"
```

---

## Task 4: Add `pdfjs-dist` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run: `cd /Users/joshcho/Documents/claude_projects/neu-cs-tracker && npm install pdfjs-dist@^4`
Expected: `pdfjs-dist` added to `dependencies` in `package.json`; `package-lock.json` updated.

- [ ] **Step 2: Verify it resolves**

Run: `node -e "require('pdfjs-dist/package.json') && console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add pdfjs-dist for client-side transcript parsing"
```

---

## Task 5: pdf.js text-extraction adapter

**Files:**
- Create: `src/lib/pdf-text.ts`

This module is the only one that touches `pdfjs-dist`. It is not unit-tested in isolation (it needs a real PDF runtime / worker); its correctness is exercised manually in Task 8 and via the component test's stub in Task 7.

- [ ] **Step 1: Read the Next.js worker guidance**

Per `AGENTS.md`, before writing build/worker config:
Run: `ls node_modules/next/dist/docs/ && grep -rl "worker\|webpack\|turbopack" node_modules/next/dist/docs/ | head`
Read any matching guide to confirm how static worker assets are loaded in this Next version. The implementation below uses pdf.js's bundler-friendly worker import (`pdfjs-dist/build/pdf.worker.mjs` via `new URL(..., import.meta.url)`), which works with the App Router client bundle; adjust only if the guide specifies otherwise.

- [ ] **Step 2: Write the implementation**

Create `src/lib/pdf-text.ts`:

```ts
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
    const items = content.items as TextItemLike[];

    // Bucket items by rounded y (PDF y grows upward, so sort desc for top-to-bottom).
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
```

- [ ] **Step 3: Verify it type-checks and builds**

Run: `npx tsc --noEmit`
Expected: no type errors in `pdf-text.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf-text.ts
git commit -m "feat(transcript): pdf.js text-extraction adapter (line grouping)"
```

---

## Task 6: `TranscriptImport` component

**Files:**
- Create: `src/components/TranscriptImport.tsx`
- Test: `__tests__/components/TranscriptImport.test.tsx`

Component calls a swappable extractor (default `extractLines`) so the test can inject text without a real PDF.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/TranscriptImport.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranscriptImport } from "@/components/TranscriptImport";

function pdfFile() {
  return new File([new Uint8Array([1, 2, 3])], "transcript.pdf", { type: "application/pdf" });
}

describe("TranscriptImport", () => {
  it("extracts, parses, and calls onImport with mapped courses", async () => {
    const extract = vi.fn().mockResolvedValue([
      "INSTITUTION CREDIT",
      "Term : Fall 2024 Semester",
      "Subject Course Level Title Grade Credit Hours Quality Points",
      "CS 5010 GR Programming Design Paradigm A- 4.000 14.668",
      "COURSE(S) IN PROGRESS",
      "Term : Summer 2026 Semester",
      "Subject Course Level Title Credit Hours Start and End Dates",
      "CS 5200 GR Database Management Sys 4.000",
    ]);
    const onImport = vi.fn();
    render(<TranscriptImport onImport={onImport} extractLinesFn={extract} />);

    const input = screen.getByLabelText(/transcript pdf/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const arg = onImport.mock.calls[0][0];
    expect(arg.completed).toHaveLength(1);
    expect(arg.inProgress).toHaveLength(1);
    expect(await screen.findByText(/imported/i)).toBeDefined();
  });

  it("shows an error when extraction throws", async () => {
    const extract = vi.fn().mockRejectedValue(new Error("bad pdf"));
    render(<TranscriptImport onImport={vi.fn()} extractLinesFn={extract} />);
    fireEvent.change(screen.getByLabelText(/transcript pdf/i), { target: { files: [pdfFile()] } });
    expect(await screen.findByText(/couldn't read/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/TranscriptImport.test.tsx`
Expected: FAIL — cannot resolve `@/components/TranscriptImport`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/TranscriptImport.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/components/TranscriptImport.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/TranscriptImport.tsx __tests__/components/TranscriptImport.test.tsx
git commit -m "feat(transcript): TranscriptImport upload component"
```

---

## Task 7: Wire into `RequirementChecker` + localStorage persistence

**Files:**
- Modify: `src/components/RequirementChecker.tsx`

- [ ] **Step 1: Add imports and the storage key**

In `src/components/RequirementChecker.tsx`, change the React import (line 3) and add new imports after line 8:

```tsx
import { useState, useEffect } from "react";
```

Add below the existing imports (after line 8, the `clsx` import):

```tsx
import { TranscriptImport } from "@/components/TranscriptImport";
import type { ParsedTranscript } from "@/lib/transcript-parser";

const STORAGE_KEY = "neu-cs-tracker:planner";

interface PersistedPlanner {
  program: ProgramId;
  completed: CompletedCourse[];
  planned: PlannedCourse[];
}
```

- [ ] **Step 2: Hydrate from localStorage on mount and persist on change**

Immediately after the four `useState` lines for `program`/`completed`/`planned` (currently lines 42-44) and before the `addingCompleted` state, the hook order is preserved. Add these two effects right after line 48 (`newPlanned` state):

```tsx
  // Hydrate once on mount (client-only; guards SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedPlanner;
      if (saved.program) setProgram(saved.program);
      if (Array.isArray(saved.completed)) setCompleted(saved.completed);
      if (Array.isArray(saved.planned)) setPlanned(saved.planned);
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, []);

  // Persist on any change.
  useEffect(() => {
    try {
      const payload: PersistedPlanner = { program, completed, planned };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full/unavailable — degrade to session-only */
    }
  }, [program, completed, planned]);

  function handleImport(result: ParsedTranscript) {
    if (result.program) setProgram(result.program);
    setCompleted(result.completed);
    setPlanned(result.inProgress);
  }
```

- [ ] **Step 3: Render the import component**

In the returned JSX, insert `<TranscriptImport>` as the first child of the outer `<div className="space-y-6">` (immediately after line 61, before the `{/* Program selector */}` block):

```tsx
      <TranscriptImport onImport={handleImport} />
```

- [ ] **Step 4: Run tests + type-check + build**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass; no type errors.

Run: `npm run build`
Expected: production build succeeds (this is the real check that the pdf.js worker config from Task 5 is compatible with the App Router bundle). If the build fails on the worker import, revisit Task 5 Step 1 guidance and adjust `workerSrc`.

- [ ] **Step 5: Commit**

```bash
git add src/components/RequirementChecker.tsx
git commit -m "feat(transcript): wire import into planner with localStorage persistence"
```

---

## Task 8: Manual verification with the real transcript

**Files:** none (manual QA)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open: `http://localhost:3000/requirements`

- [ ] **Step 2: Import the real transcript**

Click "Choose transcript PDF" and select `tmp/unofficial recent neu transcript.pdf`.
Expected:
- Status reads "Imported 5 completed, 3 in-progress (MSCS)".
- Program auto-switches to MS Computer Science.
- Completed list shows CS 5010, CS 5330, CS 5100, CS 6120, CS 6140 with grades.
- Planned list shows CS 5200, CS 5340, CS 5700.
- Requirements list and credit bar update via `analyzeGraduation`.

- [ ] **Step 3: Verify persistence**

Reload the page. Expected: the imported courses and program are still present (loaded from localStorage), no re-upload needed.

- [ ] **Step 4: Verify privacy (no network upload)**

Open DevTools → Network, re-import. Expected: no XHR/fetch carrying the PDF or course data leaves the browser (pdf.js worker loads a local asset only).

- [ ] **Step 5: Final commit (docs)**

Update `CLAUDE.md` "Graduation Requirements Engine" section to mention the transcript-import path and the `transcript-parser.ts` / `pdf-text.ts` / `TranscriptImport.tsx` files and the `neu-cs-tracker:planner` localStorage key.

```bash
git add CLAUDE.md
git commit -m "docs: document transcript import feature"
```

---

## Self-Review

**Spec coverage:**
- Transcript PDF upload → Tasks 5, 6. ✓
- Client-side parsing (pdfjs) → Task 5. ✓
- No login / on-device only → no server code added anywhere. ✓
- localStorage persistence → Task 7. ✓
- Auto-fill directly (no review gate) → Task 7 `handleImport` sets state directly. ✓
- INSTITUTION CREDIT → completed; COURSE(S) IN PROGRESS → in-progress → Task 3. ✓
- Wrapped titles rejoined → Task 3 (tested). ✓
- Term-with-no-academic-standing → Task 3 fixture (Summer Full 2025). ✓
- Term + program mapping → Task 1. ✓
- Skip not-earned grades → Task 2/3 (`isEarnedGrade`, tested). ✓
- Transfer-credit defensive handling → `parseGradedRow` grade pattern includes `TR?`; rows under INSTITUTION CREDIT with a `TR`/`T` grade parse as completed. ✓
- Error handling (bad PDF, zero courses, unknown program) → Tasks 3 (warnings) + 6 (error UI). ✓
- Privacy note in UI → Task 6. ✓
- Tests (parser unit + component) → Tasks 1–3, 6. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `ParsedTranscript` defined in Task 3, imported in Tasks 6 & 7. `extractLines` defined in Task 5, consumed in Task 6 (`extractLinesFn` default). `parseTranscript`/`parseGradedRow`/`parseInProgressRow`/`isEarnedGrade`/`termToCode`/`programToId` consistent across tasks. `handleImport` uses `result.inProgress` → `setPlanned` (PlannedCourse[]), matching types. ✓
