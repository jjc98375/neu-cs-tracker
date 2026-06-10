# Transcript Import → Auto-fill Graduation Planner — Design

**Date:** 2026-06-06
**Status:** Approved (design); pending implementation plan
**Author:** brainstormed with user (Jae Hun Cho)

## Goal

Let a student upload their **NEU Unofficial Academic Transcript PDF** and have the
graduation planner (`RequirementChecker`) auto-populate their completed and
in-progress courses, plus auto-select their degree program — instead of typing
every course by hand.

## Scope & decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Data source | **Transcript PDF upload** | NEU official API (developer portal) exists but the portal was down (504) and the `students` scope grant for a student-built app is unverified; revisit later. |
| Parsing location | **Client-side (browser, `pdfjs-dist`)** | Transcript is sensitive academic data; it must never leave the device or hit Vercel logs. Fits the app's stateless, no-DB design. |
| Login / accounts | **None** | No cross-device sync wanted. Avoids storing FERPA-adjacent records server-side. |
| Persistence | **`localStorage` (on-device)** | Survives reloads without re-upload; no server. |
| Review step | **Auto-fill directly** | Parsed courses drop straight into the planner. The existing add/delete UI handles any mis-parse correction. |

**Explicitly out of scope:** the official NEU developer-portal API integration
(deferred), cross-device sync, server-side storage, multi-file/batch import,
official transcript (Parchment) formats.

## Transcript format (from the user's real transcript)

The NEU "Unofficial Academic Transcript" (print-to-PDF from the Student Hub) has
these sections in order:

1. **STUDENT INFORMATION** — `Name`, `Primary Program` (e.g. `M.S. in Computer Science`), College, Campus, Major.
2. **DEGREE AWARDED** — Sought / Primary Degree (ignored).
3. **INSTITUTION CREDIT** — **completed courses**, grouped by term:
   - Term header: `Term : Fall 2024 Semester`
   - Optional `Academic Standing` line (absent for some terms, e.g. Summer Full 2025).
   - Column header row: `Subject Course Level Title Grade Credit Hours Quality Points Start and End Dates R CEU Contact Hours`
   - Course rows, e.g. `CS 5010 GR Programming Design Paradigm A- 4.000 14.668`
     - `Subject=CS`, `Course=5010`, `Level=GR`, `Title="Programming Design Paradigm"`, `Grade=A-`, `Credit Hours=4.000`, `Quality Points=14.668`.
     - **Titles wrap across lines** (`Programming Design` / `Paradigm`; `Fndtns Artificial` / `Intelligence`) — must be rejoined.
   - `Term Totals` block (Current Term / Cumulative) — used as a row-group terminator, values not imported.
4. **TRANSCRIPT TOTALS** — Total Institution / Total Transfer / Overall (ignored for import; marks end of completed section).
5. **COURSE(S) IN PROGRESS** — **in-progress / planned courses**, grouped by term:
   - Term header: `Term : Summer 2026 Semester`
   - Column header row: `Subject Course Level Title Credit Hours Start and End Dates` (**no Grade, no Quality Points**)
   - Rows, e.g. `CS 5200 GR Database Management Sys 4.000`.

### Term code mapping

`<Season> <Year>` → Banner term code `YYYY` + season suffix:
`Spring → 10`, `Summer → 50`, `Fall → 30`. ("Summer Full", "Summer 1", "Summer 2"
all map to `50`.) Examples: `Fall 2024 → 202430`, `Spring 2025 → 202510`,
`Summer Full 2025 → 202550`, `Spring 2026 → 202610`, `Summer 2026 → 202650`.

### Program mapping

`Primary Program` string → `ProgramId`:
- `M.S. in Computer Science` → `MSCS`
- `M.S. in Artificial Intelligence` → `MSAI`
- `M.S. in Data Science` → `MSDS`
- unrecognized → leave program unset (user picks manually).

## Data model

No new types required. Parser output maps onto existing `src/lib/types.ts`:

```ts
interface ParsedTranscript {
  program?: ProgramId;          // from Primary Program
  completed: CompletedCourse[]; // from INSTITUTION CREDIT (graded)
  inProgress: PlannedCourse[];  // from COURSE(S) IN PROGRESS
  studentName?: string;         // parsed but not displayed/stored beyond UI confirmation
  warnings: string[];           // non-fatal parse issues surfaced to the user
}
```

- **completed** ← INSTITUTION CREDIT rows. Skip rows whose grade indicates the
  course was not earned: `W`, `I`, `IP`, `NF`, `U`, `L`, `X` (withdrawn/incomplete/audit).
  Keep all letter grades (`A`..`F`, with `+`/`-`) and `S` (satisfactory).
- **inProgress** ← COURSE(S) IN PROGRESS rows (no grade present).
- **Transfer credit:** the sample has `Total Transfer 0.000`. A `TRANSFER CREDIT
  ACCEPTED BY INSTITUTION` section can appear before INSTITUTION CREDIT; parser
  treats its course rows as `completed` (grade often `TR`/`T`). Defensive — not in sample.

## Architecture

Three new units with clean boundaries:

### 1. `src/lib/transcript-parser.ts` (pure, no I/O)
- **Input:** `string[]` (text lines extracted from the PDF).
- **Output:** `ParsedTranscript`.
- **What it does:** a section-aware state machine over the lines —
  `HEADER → INSTITUTION_CREDIT → TRANSCRIPT_TOTALS → IN_PROGRESS`. Detects term
  headers, rejoins wrapped course-title fragments, classifies rows into
  completed vs in-progress, maps term/program strings.
- **Depends on:** nothing (no pdf.js, no DOM). Fully unit-testable with fixtures.
- **Why isolated:** the parsing logic is the risky part; keeping it pure means it
  is testable against real-transcript-derived text without a PDF runtime.

### 2. `src/lib/pdf-text.ts` (thin PDF adapter)
- **Input:** `File | ArrayBuffer`.
- **Output:** `Promise<string[]>` — text grouped into visual lines.
- **What it does:** loads the PDF with `pdfjs-dist`, calls `getTextContent()` per
  page, groups text items into lines by their `transform` y-coordinate (items on
  the same y belong to one line, ordered by x), returns line strings.
- **Depends on:** `pdfjs-dist` only. Configures the worker for Next.js 16 client use.
- **Why isolated:** confines the only browser/PDF dependency so the parser stays pure.

### 3. `src/components/TranscriptImport.tsx` (UI)
- Drag-and-drop + click file picker (accept `application/pdf`).
- On select: `extractLines(file)` → `parseTranscript(lines)` → calls an
  `onImport(result)` callback. Shows status: "Imported N completed, M in-progress
  for <program>", any `warnings`, and parse/extraction errors.
- **Depends on:** `pdf-text.ts`, `transcript-parser.ts`.

### Wiring: `src/components/RequirementChecker.tsx`
- Render `<TranscriptImport onImport={...} />` near the top, above the program selector.
- `onImport`: `setCompleted(result.completed)`, `setPlanned(result.inProgress)`,
  and if `result.program` set, `setProgram(result.program)`. Auto-fill, no gate.
- **Persistence:** on every change to `completed` / `planned` / `program`, write to
  `localStorage` (key e.g. `neu-cs-tracker:planner`). On mount, hydrate from it.
  Guard for SSR (only touch `localStorage` in effects / client).

### Dependency / build
- Add `pdfjs-dist` to `package.json`.
- Configure the pdf.js worker for the Next.js 16 App Router client component.
  Per `AGENTS.md`, read `node_modules/next/dist/docs/` before adding any build
  config (worker loading approach must match this Next version).

## Data flow

```
User picks PDF
  → pdf-text.extractLines(file)        [pdfjs-dist, in browser]
  → transcript-parser.parseTranscript(lines)   [pure]
  → ParsedTranscript { program, completed[], inProgress[], warnings }
  → RequirementChecker setState (completed/planned/program)
  → analyzeGraduation(...) recomputes progress (unchanged)
  → state mirrored to localStorage
```

## Error handling

- **Not a PDF / corrupt PDF:** caught in `extractLines`; component shows "Couldn't read this PDF."
- **PDF parsed but zero courses found:** parser returns empty arrays + a warning
  ("No courses recognized — is this the NEU Unofficial Academic Transcript?").
  Planner left untouched.
- **Unrecognized program string:** `program` unset, warning shown, user picks manually.
- **Wrapped-title / unexpected-row anomalies:** parser skips the malformed row,
  appends a warning naming the raw line, continues (never throws on a single bad row).
- **localStorage unavailable / quota:** persistence fails silently (feature degrades to session-only); import still works.

## Testing

`__tests__/lib/transcript-parser.test.ts` (unit, primary coverage):
- Fixture lines derived from the user's real transcript.
- Asserts: 4 completed courses (Fall 2024 CS5010, Spring 2025 CS5330, Summer Full 2025 CS5100, Spring 2026 CS6120 + CS6140), 3 in-progress (Summer 2026 CS5200/CS5340/CS5700), program `MSCS`.
- Edge cases: wrapped titles rejoined; term-with-no-academic-standing parsed; term→code mapping; grade `A-` preserved; withdrawn-grade row skipped; transfer-credit section (synthetic fixture) → completed; empty/garbage input → empty + warning.

`__tests__/components/TranscriptImport.test.tsx`:
- Given a stubbed `extractLines`/parser, selecting a file calls `onImport` with mapped courses and renders the summary; error path renders the error message.

Existing 104 tests must stay green. Run with `npx vitest run`.

## Privacy statement (surface in UI)

A short note near the uploader: "Your transcript is processed entirely in your
browser. It is never uploaded to a server. Imported courses are saved only in
this browser (localStorage)."
