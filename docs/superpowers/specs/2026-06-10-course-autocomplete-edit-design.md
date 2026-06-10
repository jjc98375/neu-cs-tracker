# Course Autocomplete + Inline Edit — Design

**Date:** 2026-06-10
**Status:** Approved (design)
**Builds on:** the transcript-import feature (planner at `/requirements`, `RequirementChecker.tsx`).

## Goal

When adding a course to the planner, let the user pick from a **searchable
typeahead** (type `CS 6620` or `machine learning` → choose → subject, number,
title, credits all fill in), and let them **edit a course after it's added**
(currently only add/delete). Fixes the gap where a manually-added course (e.g.
CS 6620) has a blank title.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Title source | **Hybrid**: curated built-in list first (instant, offline), Banner catalog as fallback for codes not in the list. |
| Input UX | **Searchable dropdown (typeahead)** replacing the separate subject/number/title inputs in the add forms. |
| Edit | **Inline edit in place** for already-added completed & planned rows. |

Out of scope: editing the program list, fuzzy ranking beyond simple substring,
caching Banner results across sessions.

## Data sources

1. **Curated catalog** — derived at module load from `PROGRAMS` in
   `src/lib/requirements.ts` (~70 `RequirementCourse` entries across MSCS/MSAI/MSDS).
   Dedupe by `subject+courseNumber` → `CatalogCourse { subject, courseNumber, title, credits }`.
2. **Banner fallback** — `/api/courses?term=&subject=&courseNumber=` returns
   `SearchResult { data: CourseSection[] }`; each section has `courseTitle`,
   `courseNumber`, `subject`, `creditHours`/`creditHourHigh`. `/api/terms` returns
   `Term[] { code, description }` (most recent first). Dedupe sections → one course.

## Architecture

### `src/lib/course-catalog.ts` (pure)
- `export interface CatalogCourse { subject: string; courseNumber: string; title: string; credits: number }`
- `export const STATIC_CATALOG: CatalogCourse[]` — built from `PROGRAMS`, deduped by `${subject} ${courseNumber}`.
- `export function searchCatalog(query: string, limit = 8): CatalogCourse[]`
  - Normalize query: strip/space-collapse. Match if either:
    - code match: `${subject}${courseNumber}` or `${subject} ${courseNumber}` starts with / contains the normalized query (case-insensitive, ignoring the space), OR
    - title match: every whitespace-separated token of the query is a case-insensitive substring of the title.
  - Return up to `limit`, code matches before title-only matches.
- `export function parseCourseCode(query: string): { subject: string; courseNumber: string } | null`
  - Matches `^([A-Za-z]{2,4})\s*(\d{4}[A-Za-z]?)$` → uppercased subject + number. Used to decide whether to fire a Banner lookup.

### `src/lib/course-lookup.ts` (client)
- `export async function lookupBannerCourse(subject: string, courseNumber: string): Promise<CatalogCourse | null>`
  - Lazily fetch `/api/terms` once (module-level cached promise); take the first (most recent) term code.
  - `GET /api/courses?term=<code>&subject=<subject>&courseNumber=<courseNumber>`.
  - From `result.data`, take the first section matching `subjectCourse`/`courseNumber`; return
    `{ subject, courseNumber, title: courseTitle, credits: creditHourHigh ?? creditHours ?? 4 }`.
  - Any failure (network, empty, missing term) → return `null` (never throw).

### `src/components/CourseAutocomplete.tsx` (client)
- Props: `{ onSelect: (c: CatalogCourse) => void; placeholder?: string; initialQuery?: string }`.
- Controlled text input + dropdown list of results.
- On each change: `results = searchCatalog(query)`. If `results` is empty AND
  `parseCourseCode(query)` is non-null, debounce (~300 ms) a `lookupBannerCourse`;
  on resolve, if non-null, show it as a single result (labeled e.g. "from catalog").
- Clicking a result calls `onSelect(course)` and closes the dropdown.
- Keyboard: Enter selects the first result; Esc closes. (Mouse click is the primary path.)
- Shows a subtle "Searching catalog…" state during a Banner lookup, and "No match — type the title manually" when nothing is found.

### `RequirementChecker.tsx` changes
- **Add forms (completed & planned):** replace the `subject` / `courseNumber` / `title`
  text inputs with one `<CourseAutocomplete onSelect={...}>` that populates those three
  fields (and `credits`) of `newCompleted`/`newPlanned`. Keep the `credits` (editable),
  `term` select, and (completed only) `grade` inputs. Manual entry still possible: if the
  user picks nothing, the typed query is ignored and they can still set fields — but
  primary flow is select-from-dropdown. Keep the existing "Add Course" validation
  (`subject && courseNumber && term`).
- **Inline edit:** each rendered completed/planned row gets a pencil button. Clicking it
  swaps the row for an editable form (subject, courseNumber, title, credits, term, and
  grade for completed) prefilled with the row's values; **Save** writes back to that
  index in the array, **Cancel** restores. Editing reuses `CourseAutocomplete` for the
  course identity plus the term/grade/credits fields. Track `editingCompletedIndex` /
  `editingPlannedIndex` state (nullable number).

## Error handling
- Banner lookup failures are silent (return null); the user types the title manually.
- Typeahead never blocks form submission; existing validation unchanged.
- Editing validates the same `subject && courseNumber && term` before Save; invalid Save is a no-op.

## Testing
- `__tests__/lib/course-catalog.test.ts`: `STATIC_CATALOG` non-empty & deduped; `searchCatalog` code match (`"CS 6140"`, `"cs6140"`), title match (`"machine learning"`), limit, code-before-title ordering; `parseCourseCode` valid/invalid.
- `__tests__/components/CourseAutocomplete.test.tsx`: typing a title filters static results and selecting calls `onSelect`; typing an unknown code with no static hit triggers the injected `lookupFn` and shows its result; no-match state.
- `__tests__/components/RequirementChecker.edit.test.tsx` (or extend existing): add via autocomplete populates the list; editing a row and saving updates it; localStorage still persists.
- All existing tests stay green; client-side only, no server changes, no new deps.
