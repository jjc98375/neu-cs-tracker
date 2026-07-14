@AGENTS.md

# Khoury Grad Planner

Course browser and graduation planner for Khoury College students (undergrad, master's, PhD).
Built with **Next.js 16.2.1**, **React 19**, **TypeScript**, **Tailwind CSS 4**, **SWR**.

## Architecture

```
src/
  app/
    page.tsx                        # Home page
    courses/page.tsx                # Course browser (client component, uses SWR)
    requirements/page.tsx           # Graduation planner (client component)
    layout.tsx                      # Root layout with nav + ThemeProvider
    globals.css                     # Tailwind imports
    api/
      terms/route.ts               # GET /api/terms
      campuses/route.ts            # GET /api/campuses?term=
      subjects/route.ts            # GET /api/subjects?term=
      courses/route.ts             # GET /api/courses?term=&subject=&...
      course-description/route.ts  # GET /api/course-description?crn=&term=
  components/
    CourseTable.tsx                 # Sortable table with expandable detail rows
    FilterPanel.tsx                 # Sidebar filters (term, subject, campus, session, etc.)
    RequirementChecker.tsx          # Graduation progress tracker
    SessionBadge.tsx                # Colored badge for summer session type
    ThemeProvider.tsx               # Dark/light mode context
  lib/
    types.ts                       # All TypeScript interfaces
    banner-api.ts                  # Server-side Banner API client + helpers
    program-schema.ts              # Recursive requirement schema (ProgramV2)
    requirements-engine.ts         # Requirements interpreter + course allocation
  data/
    programs/                      # Program JSON files + registry
__tests__/                         # Vitest tests (104 passing)
```

## Banner API Integration

All Banner calls go through Next.js API routes (server-side) to avoid CORS.
Base URL: `https://nubanner.neu.edu/StudentRegistrationSsb/ssb`

**Session flow**: Every search requires a `POST /term/search` first to get session cookies, which are then passed to subsequent GET requests.

**Key function**: `searchCourses()` in `banner-api.ts` — establishes session, queries Banner, then annotates each section with a derived `summerSession` field.

## Summer Session Detection

`deriveSummerSession(termCode, partOfTerm, meetingTimes?)` determines session type:

1. **Term code suffix** (last 2 digits):
   - `40` → Summer 1, `60` → Summer 2, `50` → needs further analysis
   - `10` → Spring, `30` → Fall (both return "N/A")
   - `54`/`55` → CPS summer terms (treated as summer but no split)
2. **For suffix "50"** — `partOfTerm` field:
   - `"A"` → Summer 1, `"B"` → Summer 2, `"1"` or `""` → Full
3. **Date-based fallback** (when partOfTerm is ambiguous): uses meeting time `startDate`/`endDate` ranges:
   - Duration >= 60 days → Full
   - Ends before July → Summer 1
   - Starts late June or later → Summer 2

## Graduation Requirements Engine

`src/lib/program-schema.ts` defines the recursive requirement schema (ProgramV2:
course / range / allOf / chooseN / chooseCredits nodes + PhD milestones + UG NUpath
checklist). Program data lives in `src/data/programs/*.json` (one file per program,
with catalogUrl/catalogYear/verifiedAt provenance), registered in
`src/data/programs/index.ts` (`PROGRAMS`, `PROGRAM_IDS`, legacy-ID mapping).

`src/lib/requirements-engine.ts` interprets the tree: completed/planned courses are
allocated to leaves (each course used at most once; exact course leaves claim before
ranges), statuses evaluate bottom-up, and `analyzeGraduation(program, completed,
planned)` returns credit totals, a nested status tree, a missing list, and a
level-paced expected graduation term (UG 16 cr/term, MS 8, PhD none).

Design spec: `docs/superpowers/specs/2026-07-12-khoury-programs-design.md`.

## Transcript Import (auto-fill the planner)

Students upload their **NEU Unofficial Academic Transcript PDF** on `/requirements`
and the planner auto-fills completed + in-progress courses and the program.
**100% client-side** — the PDF is parsed in the browser and nothing is uploaded to a
server; results persist only in `localStorage` (key `neu-cs-tracker:planner`).

**Flow:** `TranscriptImport` → `extractLines(file)` (pdf.js) → `parseTranscript(lines)` →
`RequirementChecker` sets completed/planned/program (auto-fill, no review gate).

**Files:**
- `src/lib/transcript-parser.ts` — **pure** `parseTranscript(lines: string[]): ParsedTranscript`
  (+ `termToCode`, `programToId`, `isEarnedGrade`, `parseGradedRow`, `parseInProgressRow`).
  No I/O, fully unit-tested.
- `src/lib/pdf-text.ts` — `"use client"` pdf.js adapter; `extractLines(file)` groups text
  items into visual lines by y-coordinate. Only module importing `pdfjs-dist`.
- `src/components/TranscriptImport.tsx` — upload UI; injectable `extractLinesFn` for tests.
- `RequirementChecker.tsx` — renders the importer, hydrates/persists planner state to localStorage.

**Parser gotcha (do not regress):** pdf.js extraction of the real transcript splits a
**long course title across three rows** — a fragment ABOVE the code row, a *titleless*
code row (`CS 5010 GR A- 4.000 14.668`), and a fragment BELOW. Short titles stay inline
(`CS 6140 GR Machine Learning A 4.000 16.000`). The column header wraps into three rows
(`Credit Quality…`, `Subject Course Level…`, `Hours Points…`) and `about:blank N/N` page
footers appear. `parseTranscript` reconstructs titles from adjacent rows and ignores the
noise. The test fixture in `__tests__/lib/transcript-parser.test.ts` is the **byte-exact**
`extractLines` output on a real transcript — keep it that way. Completed courses come from
`INSTITUTION CREDIT` (graded; not-earned grades W/I/IP/NF/U/L/X skipped); in-progress from
`COURSE(S) IN PROGRESS`. Term mapping: Spring=10, Summer=50, Fall=30 (e.g. Fall 2024 → 202430).

Design spec + plan: `docs/superpowers/specs/2026-06-06-transcript-import-design.md`,
`docs/superpowers/plans/2026-06-06-transcript-import.md`.

### Course autocomplete + inline edit

Adding a planner course uses a **searchable typeahead** instead of raw text fields, and
added courses are **editable in place**.
- `src/lib/course-catalog.ts` — pure. `STATIC_CATALOG` (deduped from `PROGRAMS` in
  `requirements.ts`, ~70 courses), `searchCatalog(query, limit?)` (matches course code or
  title tokens), `parseCourseCode(query)`. Instant, offline.
- `src/lib/course-lookup.ts` — client. `lookupBannerCourse(subject, number)`: latest term
  via `/api/terms` (cached) → `/api/courses` → `{title, credits}`. Best-effort **fallback**
  for codes not in the curated list; returns `null` on any failure (never throws).
- `src/components/CourseAutocomplete.tsx` — typeahead: filters `STATIC_CATALOG` synchronously;
  if no static hit and the query is a course code, debounces `lookupBannerCourse` (injectable
  `lookupFn` for tests). `onSelect` fills subject/number/title/credits.
- `RequirementChecker.tsx` — add forms use `CourseAutocomplete`; the `EditableCourseRow`
  subcomponent renders each completed/planned row with a pencil (edit) + trash (delete);
  edits write back by index and persist via the existing localStorage effect.

Spec + plan: `docs/superpowers/specs/2026-06-10-course-autocomplete-edit-design.md`,
`docs/superpowers/plans/2026-06-10-course-autocomplete-edit.md`.

> **Note:** The international-student RAG assistant that previously lived here has moved to
> its own project, **NEU International Assistant**. This repo is now scoped to the course
> browser and graduation planner only.

## Testing

```bash
npx vitest run          # Run all 104 tests
npx vitest run --watch  # Watch mode
```

Tests cover: banner-api helpers, requirements engine, SessionBadge component, all API routes.

## Development

```bash
npm run dev             # Start dev server
npm run build           # Production build
npm run lint            # ESLint
```

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.mts).

## Important Notes

- Client components use `"use client"` directive (courses page, requirements page, all components)
- SWR handles client-side data fetching with caching in the courses page
- Dark mode is supported via ThemeProvider with localStorage persistence
- Banner API responses include `meetingsFaculty` array with `meetingTime` objects containing schedule, dates, and location
- The `partOfTerm` field from Banner is not always reliable for summer session detection — the date-based fallback in `deriveSummerSession` handles cases where Banner returns ambiguous values

## Agents

### api-tester
Run with: dispatch the `api-tester` agent (or use Agent tool with `.claude/agents/api-tester.md`).
Requires: dev server running (`npm run dev`).
Tests: `__tests__/integration/` — live HTTP tests against Banner API routes.
Use when: courses don't load after term switch, summer session labels are wrong, or API returns empty/stale data.
