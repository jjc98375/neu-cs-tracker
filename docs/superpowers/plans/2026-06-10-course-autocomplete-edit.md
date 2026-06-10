# Course Autocomplete + Inline Edit — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. TDD, checkbox steps.

**Goal:** Searchable course typeahead (curated list + Banner fallback) for adding planner courses, and inline editing of added courses.

**Architecture:** Pure catalog/search in `course-catalog.ts`; client Banner fallback in `course-lookup.ts`; reusable `CourseAutocomplete` typeahead; wire both into `RequirementChecker` add forms and add inline edit.

**Tech Stack:** Next.js 16, React 19, TS, Vitest + @testing-library/react. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-10-course-autocomplete-edit-design.md`

Run tests from `/Users/joshcho/Documents/claude_projects/neu-cs-tracker` with `npx vitest run <file>`.

---

## Task 1: `course-catalog.ts` (pure catalog + search)

**Files:** Create `src/lib/course-catalog.ts`; Test `__tests__/lib/course-catalog.test.ts`.

- [ ] **Step 1: Failing test** — `__tests__/lib/course-catalog.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STATIC_CATALOG, searchCatalog, parseCourseCode } from "@/lib/course-catalog";

describe("STATIC_CATALOG", () => {
  it("is non-empty and deduped by subject+number", () => {
    expect(STATIC_CATALOG.length).toBeGreaterThan(20);
    const keys = STATIC_CATALOG.map((c) => `${c.subject} ${c.courseNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("includes known courses with titles", () => {
    const ml = STATIC_CATALOG.find((c) => c.subject === "CS" && c.courseNumber === "6140");
    expect(ml?.title).toMatch(/machine learning/i);
  });
});

describe("parseCourseCode", () => {
  it("parses codes with/without space", () => {
    expect(parseCourseCode("CS 6620")).toEqual({ subject: "CS", courseNumber: "6620" });
    expect(parseCourseCode("cs6620")).toEqual({ subject: "CS", courseNumber: "6620" });
  });
  it("returns null for non-codes", () => {
    expect(parseCourseCode("machine learning")).toBeNull();
    expect(parseCourseCode("CS")).toBeNull();
  });
});

describe("searchCatalog", () => {
  it("matches by code, ignoring spacing/case", () => {
    const r = searchCatalog("cs6140");
    expect(r[0]).toMatchObject({ subject: "CS", courseNumber: "6140" });
  });
  it("matches by title tokens", () => {
    const r = searchCatalog("machine learning");
    expect(r.some((c) => c.courseNumber === "6140")).toBe(true);
  });
  it("respects the limit", () => {
    expect(searchCatalog("CS", 3).length).toBeLessThanOrEqual(3);
  });
  it("returns [] for empty query", () => {
    expect(searchCatalog("")).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run → FAIL (module missing).

- [ ] **Step 3: Implement** `src/lib/course-catalog.ts`:

```ts
import { PROGRAMS } from "@/lib/requirements";

export interface CatalogCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
}

function buildCatalog(): CatalogCourse[] {
  const seen = new Map<string, CatalogCourse>();
  for (const program of Object.values(PROGRAMS)) {
    for (const req of program.requirements) {
      const key = `${req.subject} ${req.courseNumber}`;
      if (!seen.has(key)) {
        seen.set(key, {
          subject: req.subject,
          courseNumber: req.courseNumber,
          title: req.title,
          credits: req.credits,
        });
      }
    }
  }
  return [...seen.values()];
}

export const STATIC_CATALOG: CatalogCourse[] = buildCatalog();

const CODE_RE = /^([A-Za-z]{2,4})\s*(\d{4}[A-Za-z]?)$/;

export function parseCourseCode(query: string): { subject: string; courseNumber: string } | null {
  const m = query.trim().match(CODE_RE);
  if (!m) return null;
  return { subject: m[1].toUpperCase(), courseNumber: m[2].toUpperCase() };
}

export function searchCatalog(query: string, limit = 8): CatalogCourse[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const codeQ = q.replace(/\s+/g, "");
  const tokens = q.split(/\s+/);

  const codeMatches: CatalogCourse[] = [];
  const titleMatches: CatalogCourse[] = [];
  for (const c of STATIC_CATALOG) {
    const code = `${c.subject}${c.courseNumber}`.toLowerCase();
    if (code.includes(codeQ)) {
      codeMatches.push(c);
    } else if (tokens.every((t) => c.title.toLowerCase().includes(t))) {
      titleMatches.push(c);
    }
  }
  return [...codeMatches, ...titleMatches].slice(0, limit);
}
```

NOTE: confirm the `PROGRAMS` shape — each program has a `requirements: RequirementCourse[]` array (see `src/lib/requirements.ts`). If the property is named differently, adapt `program.requirements` accordingly. `RequirementCourse` has `subject`, `courseNumber`, `title`, `credits`.

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `git add src/lib/course-catalog.ts __tests__/lib/course-catalog.test.ts && git commit -m "feat(catalog): static course catalog + search/code helpers"`

---

## Task 2: `course-lookup.ts` (Banner fallback)

**Files:** Create `src/lib/course-lookup.ts`; Test `__tests__/lib/course-lookup.test.ts`.

- [ ] **Step 1: Failing test** — inject `fetch` via the global; verify it builds the right URLs and maps the result:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupBannerCourse, __resetTermCacheForTests } from "@/lib/course-lookup";

beforeEach(() => __resetTermCacheForTests());

function mockFetchSequence(termsJson: unknown, coursesJson: unknown) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => termsJson })
    .mockResolvedValueOnce({ ok: true, json: async () => coursesJson });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lookupBannerCourse", () => {
  it("returns title+credits from the latest term", async () => {
    const fetchMock = mockFetchSequence(
      [{ code: "202650", description: "Summer 2026" }],
      { data: [{ subject: "CS", courseNumber: "6620", subjectCourse: "CS6620", courseTitle: "Reinforcement Learning", creditHours: 4, creditHourHigh: 4 }] }
    );
    const r = await lookupBannerCourse("CS", "6620");
    expect(r).toEqual({ subject: "CS", courseNumber: "6620", title: "Reinforcement Learning", credits: 4 });
    expect(fetchMock.mock.calls[1][0]).toContain("term=202650");
    expect(fetchMock.mock.calls[1][0]).toContain("subject=CS");
    expect(fetchMock.mock.calls[1][0]).toContain("courseNumber=6620");
  });
  it("returns null when no course matches", async () => {
    mockFetchSequence([{ code: "202650", description: "Summer 2026" }], { data: [] });
    expect(await lookupBannerCourse("CS", "9999")).toBeNull();
  });
  it("returns null on fetch error (never throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await lookupBannerCourse("CS", "6620")).toBeNull();
  });
});
```

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement** `src/lib/course-lookup.ts`:

```ts
import type { CatalogCourse } from "@/lib/course-catalog";

interface Term { code: string; description: string }

let termsPromise: Promise<Term[]> | null = null;

/** Test-only: clear the cached terms promise between cases. */
export function __resetTermCacheForTests() {
  termsPromise = null;
}

async function latestTermCode(): Promise<string | null> {
  if (!termsPromise) {
    termsPromise = fetch("/api/terms").then((r) => (r.ok ? r.json() : []));
  }
  try {
    const terms = await termsPromise;
    return Array.isArray(terms) && terms.length ? terms[0].code : null;
  } catch {
    return null;
  }
}

export async function lookupBannerCourse(
  subject: string,
  courseNumber: string
): Promise<CatalogCourse | null> {
  try {
    const term = await latestTermCode();
    if (!term) return null;
    const url = `/api/courses?term=${encodeURIComponent(term)}&subject=${encodeURIComponent(subject)}&courseNumber=${encodeURIComponent(courseNumber)}&pageMaxSize=50`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ subject: string; courseNumber: string; courseTitle: string; creditHours: number | null; creditHourHigh: number | null }> };
    const hit = json.data?.find((s) => s.courseNumber === courseNumber) ?? json.data?.[0];
    if (!hit) return null;
    return {
      subject: hit.subject,
      courseNumber: hit.courseNumber,
      title: hit.courseTitle,
      credits: hit.creditHourHigh ?? hit.creditHours ?? 4,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `git add src/lib/course-lookup.ts __tests__/lib/course-lookup.test.ts && git commit -m "feat(catalog): Banner course lookup fallback"`

---

## Task 3: `CourseAutocomplete` component

**Files:** Create `src/components/CourseAutocomplete.tsx`; Test `__tests__/components/CourseAutocomplete.test.tsx`.

- [ ] **Step 1: Failing test:**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";

describe("CourseAutocomplete", () => {
  it("filters static catalog and selects on click", async () => {
    const onSelect = vi.fn();
    render(<CourseAutocomplete onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "machine learning" } });
    const opt = await screen.findByText(/6140/);
    fireEvent.click(opt);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ courseNumber: "6140" }));
  });

  it("falls back to the injected lookup for an unknown code", async () => {
    const lookupFn = vi.fn().mockResolvedValue({ subject: "CS", courseNumber: "9100", title: "Special Topics", credits: 4 });
    const onSelect = vi.fn();
    render(<CourseAutocomplete onSelect={onSelect} lookupFn={lookupFn} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "CS 9100" } });
    await waitFor(() => expect(lookupFn).toHaveBeenCalledWith("CS", "9100"));
    fireEvent.click(await screen.findByText(/Special Topics/));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ courseNumber: "9100", title: "Special Topics" }));
  });
});
```

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement** `src/components/CourseAutocomplete.tsx`. Use the curated search synchronously; debounce the injected `lookupFn` (default `lookupBannerCourse`) only when there are no static results and the query is a course code. Match existing input styling (`border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] ...`).

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { searchCatalog, parseCourseCode, type CatalogCourse } from "@/lib/course-catalog";
import { lookupBannerCourse } from "@/lib/course-lookup";

interface Props {
  onSelect: (course: CatalogCourse) => void;
  placeholder?: string;
  lookupFn?: (subject: string, courseNumber: string) => Promise<CatalogCourse | null>;
}

export function CourseAutocomplete({ onSelect, placeholder = "Search course (e.g. CS 6140 or machine learning)", lookupFn = lookupBannerCourse }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCourse[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = searchCatalog(query);
    setResults(local);
    setOpen(query.trim().length > 0);
    if (debounce.current) clearTimeout(debounce.current);
    if (local.length === 0) {
      const code = parseCourseCode(query);
      if (code) {
        setSearching(true);
        debounce.current = setTimeout(async () => {
          const hit = await lookupFn(code.subject, code.courseNumber);
          setSearching(false);
          if (hit) setResults([hit]);
        }, 300);
      } else {
        setSearching(false);
      }
    } else {
      setSearching(false);
    }
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, lookupFn]);

  function choose(c: CatalogCourse) {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="w-full border border-slate-300 dark:border-[#243049] rounded px-2 py-1.5 text-sm bg-white dark:bg-[#1e2537] text-slate-900 dark:text-slate-100"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { e.preventDefault(); choose(results[0]); } if (e.key === "Escape") setOpen(false); }}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1e2537] border border-slate-200 dark:border-[#243049] rounded-lg shadow-lg max-h-64 overflow-auto">
          {results.map((c) => (
            <button
              key={`${c.subject} ${c.courseNumber}`}
              type="button"
              onClick={() => choose(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-[#243049] flex items-center gap-2"
            >
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">{c.subject} {c.courseNumber}</span>
              <span className="text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
            </button>
          ))}
          {results.length === 0 && searching && <div className="px-3 py-2 text-sm text-slate-400">Searching catalog…</div>}
          {results.length === 0 && !searching && <div className="px-3 py-2 text-sm text-slate-400">No match — type the title manually in the fields below.</div>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `git add src/components/CourseAutocomplete.tsx __tests__/components/CourseAutocomplete.test.tsx && git commit -m "feat(planner): CourseAutocomplete typeahead (catalog + Banner fallback)"`

---

## Task 4: Wire autocomplete into the add forms

**Files:** Modify `src/components/RequirementChecker.tsx`.

READ the file first. The add-completed form and add-planned form each have three text inputs mapped over `["subject","courseNumber","title"]`. Replace that mapped block (in BOTH forms) with a `<CourseAutocomplete>` whose `onSelect` fills the corresponding `newCompleted`/`newPlanned` fields.

- [ ] **Step 1:** Add import: `import { CourseAutocomplete } from "@/components/CourseAutocomplete";`

- [ ] **Step 2:** In the **completed** add form, replace the `{(["subject","courseNumber","title"] as const).map(...)}` input block with:

```tsx
            <div className="col-span-2 md:col-span-3">
              <CourseAutocomplete
                onSelect={(c) =>
                  setNewCompleted({ ...newCompleted, subject: c.subject, courseNumber: c.courseNumber, title: c.title, credits: c.credits })
                }
              />
              {newCompleted.subject && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selected: <span className="font-mono">{newCompleted.subject} {newCompleted.courseNumber}</span> {newCompleted.title}
                </p>
              )}
            </div>
```

- [ ] **Step 3:** Do the same in the **planned** add form, using `setNewPlanned`.

- [ ] **Step 4:** Verify build/tests: `npx vitest run && npx tsc --noEmit`. Manually confirm the add forms still validate on `subject && courseNumber && term`.

- [ ] **Step 5: Commit** `git add src/components/RequirementChecker.tsx && git commit -m "feat(planner): use CourseAutocomplete in add forms"`

---

## Task 5: Inline edit of added courses

**Files:** Modify `src/components/RequirementChecker.tsx`; Test `__tests__/components/RequirementChecker.edit.test.tsx`.

- [ ] **Step 1: Failing test** (render the planner, simulate editing a seeded course). Since the component manages its own state, test via the UI: add a course through the autocomplete, click its edit (pencil) button, change the title, save, and assert the updated title shows. Use a fixture course present in the static catalog (CS 6140).

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequirementChecker } from "@/components/RequirementChecker";

beforeEach(() => localStorage.clear());

describe("RequirementChecker inline edit", () => {
  it("edits an added completed course title", async () => {
    render(<RequirementChecker />);
    // open Completed add form
    fireEvent.click(screen.getAllByText("Add")[0]);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "machine learning" } });
    fireEvent.click(await screen.findByText(/6140/));
    // pick a term then add
    const termSelect = screen.getByDisplayValue("Select term");
    fireEvent.change(termSelect, { target: { value: "202610" } });
    fireEvent.click(screen.getByText("Add Course"));
    // the row exists
    expect(await screen.findByText(/Machine Learning/)).toBeDefined();
    // click edit (pencil) on the row, change title, save
    fireEvent.click(screen.getByLabelText(/edit cs 6140/i));
    const titleInput = screen.getByDisplayValue("Machine Learning");
    fireEvent.change(titleInput, { target: { value: "ML Edited" } });
    fireEvent.click(screen.getByText("Save"));
    expect(await screen.findByText("ML Edited")).toBeDefined();
  });
});
```

NOTE: adapt selectors to the actual markup if needed (the seeding flow must match the real add-form behavior from Task 4). If driving the full add flow proves brittle, the implementer may instead extract the row-rendering into a small sub-component with explicit props and test that in isolation — but prefer the integration test if feasible.

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement** inline edit:
  - Add state: `const [editingCompleted, setEditingCompleted] = useState<number | null>(null);` and `const [editingPlanned, setEditingPlanned] = useState<number | null>(null);` plus a `draft` for the row being edited (or edit fields directly).
  - In the completed list `.map((c, i) => ...)`, when `editingCompleted === i`, render an editable form (subject/courseNumber/title/credits/term/grade prefilled) with **Save** (writes back: `setCompleted(completed.map((x, j) => j === i ? draft : x))`, clear editing) and **Cancel** (clear editing). Otherwise render the existing read-only row plus a pencil button: `<button aria-label={`Edit ${c.subject} ${c.courseNumber}`} onClick={() => { setDraft(c); setEditingCompleted(i); }}>` with a `Pencil` icon from lucide-react.
  - Same for the planned list (no grade field).
  - Reuse `CourseAutocomplete` inside the edit form for changing the course identity, but also allow direct title/credits edits.

- [ ] **Step 4:** Run the edit test + full suite + tsc → PASS / green.
- [ ] **Step 5: Commit** `git add src/components/RequirementChecker.tsx __tests__/components/RequirementChecker.edit.test.tsx && git commit -m "feat(planner): inline edit for completed and planned courses"`

---

## Task 6: Build + manual QA

- [ ] **Step 1:** `npm run build` → must succeed.
- [ ] **Step 2:** `npm run dev`, open `/requirements`:
  - Add Planned → type "CS 6620" → catalog/Banner result appears → select → title fills.
  - Type "machine learning" → CS 6140 appears → select.
  - Edit an existing row (pencil) → change title/term → Save → persists across reload.
- [ ] **Step 3:** Update `CLAUDE.md` Transcript Import / planner section to mention `course-catalog.ts`, `course-lookup.ts`, `CourseAutocomplete.tsx`, and inline edit. Commit `docs:`.

---

## Self-Review
- Title source hybrid → Tasks 1 (static) + 2 (Banner) + 3 (combined in component). ✓
- Typeahead replaces add-form inputs → Task 4. ✓
- Inline edit completed & planned → Task 5. ✓
- Tests for catalog, lookup, component, edit → Tasks 1,2,3,5. ✓
- No new deps; client-only; existing validation preserved. ✓
- Type consistency: `CatalogCourse` defined in Task 1, used in 2/3/4/5. `lookupBannerCourse` signature `(subject, courseNumber) => Promise<CatalogCourse|null>` consistent. ✓
