# Khoury Grad Planner — Multi-Program Support Design

**Date:** 2026-07-12
**Status:** Approved pending review

## Summary

Rebrand the app to **Khoury Grad Planner** and expand program support from 3 hardcoded
MS programs to **~12 rigorously verified Khoury College programs** across undergrad,
master's, and PhD levels. This requires a new recursive requirement schema (the current
flat model cannot express undergrad requirements), a rewritten analysis engine, per-program
JSON data files researched against the live NEU catalog, and UI updates.

## Scope

### Programs (verified tier, v1)

| Level | Programs |
|---|---|
| Undergrad (4) | BS Computer Science (BSCS), BA Computer Science (BACS), BS Cybersecurity, BS Data Science |
| Master's (5) | MS Computer Science (MSCS), Align MSCS, MS Artificial Intelligence (MSAI), MS Data Science (MSDS), MS Cybersecurity |
| PhD (2–3) | PhD Computer Science, PhD Cybersecurity, PhD Personal Health Informatics (if catalog data is clear) |

### Explicitly out of scope (v1)

- Undergrad **combined majors** (~30+ "CS and X" programs)
- **Joint master's** with other colleges (Health Informatics, Game Science and Design, Robotics)
- Automatic **NUpath** tracking — NUpath renders as a manual info checklist only
- Catalog **scraper pipeline** — all 12 programs are hand-researched and hand-authored
- Dual degrees, minors, certificates

### Prior decisions (from brainstorm)

- Undergrad: **major requirements only**; NUpath = manual checklist the student ticks.
- PhD: **coursework via the engine + milestone checklist** (qualifier, proposal, candidacy,
  dissertation, teaching) as manual booleans.
- Data lives as **JSON files committed to the repo** — no database, no admin UI.

## Architecture

### 1. Data: one JSON file per program

```
src/data/programs/
  bscs.json  bacs.json  bs-cy.json  bs-ds.json
  mscs.json  mscs-align.json  msai.json  msds.json  ms-cy.json
  phd-cs.json  phd-cy.json  phd-phi.json
src/data/programs/index.ts   # typed registry: imports all JSONs, exports PROGRAMS map
```

Every file records `catalogUrl`, `catalogYear`, and `verifiedAt` so each requirement is
traceable to its source. Updating for a new catalog year = editing JSON, no code changes.

### 2. Schema v2: recursive requirement tree (`src/lib/program-schema.ts`)

```ts
type RequirementNode =
  | { type: "course"; subject: string; number: string; title: string; credits: number }
  | { type: "range"; subject: string; minNumber: number; maxNumber: number;
      creditsPer: number; label?: string }          // e.g. "any CS 5000–7999"
  | { type: "allOf"; label: string; children: RequirementNode[] }
  | { type: "chooseN"; label: string; n: number; children: RequirementNode[] }
  | { type: "chooseCredits"; label: string; credits: number; children: RequirementNode[] };

interface Milestone { id: string; label: string; description?: string }
interface ChecklistItem { id: string; label: string }

interface ProgramV2 {
  id: string;                       // "bscs", "mscs-align", ...
  name: string;                     // "BS Computer Science"
  level: "UG" | "MS" | "PhD";
  totalCredits: number;             // UG ~134, MS 32, PhD ~48
  minGpa: number;
  catalogUrl: string;
  catalogYear: string;              // "2025-2026"
  verifiedAt: string;               // ISO date of last human verification
  requirements: RequirementNode;    // root node, typically allOf of sections
  milestones?: Milestone[];         // PhD only
  infoChecklist?: ChecklistItem[];  // UG only (NUpath 11 areas)
}
```

Nesting expresses what the flat model cannot: OR-of-AND sequences
(`chooseN(1, [allOf(CS 2500, CS 2501), allOf(DS 2000, DS 2001)])`), credit buckets
(`chooseCredits(8, [...])`), and open ranges (`range(CS, 5000, 7999)`).

### 3. Engine v2: tree interpreter (`src/lib/requirements-engine.ts`)

`analyzeGraduation(programId, completed, planned)` is rewritten to:

1. **Allocate** each completed/planned course to at most one leaf (course or range) via a
   greedy depth-first pass — a single course never satisfies two requirements. Exact course
   leaves are matched before range leaves so specific requirements claim courses first.
2. **Evaluate** each node bottom-up into a status tree:
   `{ node, state: "complete" | "partial" | "missing", satisfiedCount/credits, children }`.
3. Return credit totals, the nested status tree, a flat missing-requirements list,
   `onTrack`, and `expectedGraduationTerm` — pacing now varies by level:
   UG ≈ 16 credits/semester, MS ≈ 8, PhD = no projection (milestone-driven).

Existing helpers (`termToSortKey`, `nextTerm`, `termDescription`) are kept.
`src/lib/requirements.ts` (flat model) is deleted after migration; `types.ts` requirement
types are replaced by the v2 types.

### 4. UI

- **ProgramPicker** (new): grouped selector — Undergrad / Master's / PhD sections, 12 programs.
  Replaces the current 3-option dropdown in `RequirementChecker`.
- **RequirementChecker** (updated): renders the nested status tree as collapsible groups
  with per-group progress ("2 of 3 complete"). Completed/planned course management,
  transcript import, autocomplete, and localStorage persistence are unchanged.
- **MilestoneChecklist** (new): manual checkboxes for PhD milestones and UG NUpath items,
  persisted in the same localStorage planner state (keyed per program).
- **Rebrand**: "NEU Grad Planner" → **"Khoury Grad Planner"** in nav, landing, metadata,
  and `package.json` name. localStorage key stays `neu-cs-tracker:planner` (avoid wiping
  existing users' data) but the stored shape gains `milestoneChecks` / `nupathChecks`.
- **Transcript import**: extend `programToId` mapping to recognize the 12 programs
  (e.g. "Computer Science" + level → bscs/mscs; "Khoury Align" → mscs-align).

### 5. Research process (rigor requirement)

Data authoring happens in the implementation phase as a two-pass process per program:

1. **Author pass**: an agent reads the program's live page on catalog.northeastern.edu
   (2025-2026 catalog) and drafts the JSON with catalog citations.
2. **Adversarial verify pass**: a separate agent re-reads the same catalog page and
   attempts to refute the drafted JSON line-by-line (missing options, wrong credits,
   misplaced OR groups). Discrepancies are fixed and re-checked.

The existing MSCS/MSAI/MSDS data is **re-verified through the same process** during
migration — it was authored from the 2024-2026 catalog and may be stale.

## Delivery: two sub-projects

1. **Schema v2 + engine v2 + UI + rebrand** — new schema/engine with the 3 existing
   programs migrated (and re-verified), nested RequirementChecker rendering,
   MilestoneChecklist, rebrand. All existing tests migrated + new engine tests
   (allocation, nesting, ranges, credit buckets).
2. **Khoury research pass** — author + verify the remaining ~9 programs' JSON,
   ProgramPicker with level grouping, transcript `programToId` expansion,
   per-program tests (fixture student → expected analysis).

## Testing

- **Engine unit tests**: allocation (no double-counting; specific-before-range), each node
  type, deep nesting, partial states, level-based graduation pacing.
- **Schema validation test**: every JSON in `src/data/programs/` parses against the schema
  (zod or hand-rolled validator) — catches authoring typos in CI.
- **Per-program fixture tests**: for each program, a synthetic student (mix of completed/
  planned) with hand-computed expected output.
- **Component tests**: nested rendering, ProgramPicker, MilestoneChecklist persistence.
- Existing transcript-parser and banner-api tests unaffected.

## Error handling

- Unknown `programId` in localStorage (e.g. legacy "MSCS" uppercase): map legacy IDs →
  new IDs (`MSCS` → `mscs`, etc.) on hydration; unknown values fall back to no selection.
- Courses that match no requirement leaf count toward total credits as free electives
  (same behavior as today).
- Malformed program JSON fails the schema-validation test at build/CI time, never at runtime.
