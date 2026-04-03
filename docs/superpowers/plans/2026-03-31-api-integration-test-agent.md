# API Integration Test Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a test agent that validates all Banner API routes return correct, term-matched data against the live dev server — catching the "switch term and courses disappear" bug class.

**Architecture:** Integration tests that hit the running Next.js dev server's API routes with real HTTP requests (not mocked). A dedicated test file per API endpoint, plus a cross-cutting "term switching" test suite that simulates the exact UI flow: load terms -> pick term -> load subjects/campuses -> search courses -> switch term -> repeat. A custom agent definition dispatches these tests on demand.

**Tech Stack:** Vitest, native `fetch` (no mocks), running Next.js dev server on `localhost:3000`

---

### Task 1: Create the integration test helper

**Files:**
- Create: `__tests__/integration/helpers.ts`

- [ ] **Step 1: Write the helper module**

```ts
/**
 * Integration test helpers.
 * These tests hit the LIVE dev server — start it with `npm run dev` first.
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

export async function apiGet<T = unknown>(path: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

/** Known term codes to test against. Update each semester. */
export const TEST_TERMS = {
  fall2025:       "202530",
  spring2026:     "202610",
  summerFull2026: "202650",
} as const;

/** Wait for dev server to be reachable, or throw after timeout. */
export async function waitForServer(timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/terms`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server not reachable at ${BASE_URL} after ${timeoutMs}ms`);
}
```

- [ ] **Step 2: Commit**

```bash
git add __tests__/integration/helpers.ts
git commit -m "feat: add integration test helpers for live API testing"
```

---

### Task 2: Test `/api/terms` — terms load correctly

**Files:**
- Create: `__tests__/integration/terms.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer } from "./helpers";

describe("[integration] GET /api/terms", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns a non-empty array of terms", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each term has code and description", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    for (const term of data) {
      expect(term.code).toMatch(/^\d{6}$/);
      expect(term.description).toBeTruthy();
    }
  });

  it("includes known recent terms", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    const codes = data.map((t) => t.code);
    // At least one summer 2026 term should exist
    expect(codes.some((c) => c.startsWith("2026"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes against live server**

Run: `npx vitest run __tests__/integration/terms.integration.test.ts --reporter=verbose`
Expected: 3 PASS (assuming dev server is running)

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/terms.integration.test.ts
git commit -m "test: add integration tests for /api/terms"
```

---

### Task 3: Test `/api/subjects` and `/api/campuses` — per-term metadata

**Files:**
- Create: `__tests__/integration/metadata.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

describe("[integration] GET /api/subjects", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns subjects for a valid term", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("includes CS subject for fall term", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    expect(data.some((s) => s.code === "CS")).toBe(true);
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/subjects");
    expect(status).toBe(400);
  });

  it("returns subjects for summer term too", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.summerFull2026}`
    );
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe("[integration] GET /api/campuses", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns campuses for a valid term", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>(
      `/api/campuses?term=${TEST_TERMS.fall2025}`
    );
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/campuses");
    expect(status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/integration/metadata.integration.test.ts --reporter=verbose`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/metadata.integration.test.ts
git commit -m "test: add integration tests for /api/subjects and /api/campuses"
```

---

### Task 4: Test `/api/courses` — course search and term matching

**Files:**
- Create: `__tests__/integration/courses.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

interface CourseSection {
  courseReferenceNumber: string;
  term: string;
  subject: string;
  courseNumber: string;
  courseTitle: string;
  summerSession: string;
  partOfTerm: string;
  meetingsFaculty: {
    meetingTime: {
      startDate: string | null;
      endDate: string | null;
    };
  }[];
  seatsAvailable: number;
  maximumEnrollment: number;
  enrollment: number;
}

interface SearchResult {
  totalCount: number;
  data: CourseSection[];
}

describe("[integration] GET /api/courses", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns CS courses for fall term", async () => {
    const { status, data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    expect(status).toBe(200);
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("every returned course belongs to the requested term", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    for (const section of data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
  });

  it("every returned course has the requested subject", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    for (const section of data.data) {
      expect(section.subject).toBe("CS");
    }
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/courses");
    expect(status).toBe(400);
  });

  it("returns courses for summer full term", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("all summer full courses have a valid summerSession value", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    const validSessions = ["Full", "Summer1", "Summer2", "N/A"];
    for (const section of data.data) {
      expect(validSessions).toContain(section.summerSession);
    }
  });

  it("summer courses with short date ranges are NOT all labeled Full", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    // At least one section should be Summer1 or Summer2 (not all Full)
    const sessions = data.data.map((s) => s.summerSession);
    const hasSplit = sessions.includes("Summer1") || sessions.includes("Summer2");
    expect(hasSplit).toBe(true);
  });

  it("each section has required enrollment fields", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS&pageMaxSize=10`
    );
    for (const section of data.data) {
      expect(section.courseReferenceNumber).toBeTruthy();
      expect(section.courseTitle).toBeTruthy();
      expect(typeof section.maximumEnrollment).toBe("number");
      expect(typeof section.enrollment).toBe("number");
      expect(typeof section.seatsAvailable).toBe("number");
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/integration/courses.integration.test.ts --reporter=verbose`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/courses.integration.test.ts
git commit -m "test: add integration tests for /api/courses with term matching"
```

---

### Task 5: Test term switching — the exact bug scenario

**Files:**
- Create: `__tests__/integration/term-switching.integration.test.ts`

- [ ] **Step 1: Write the test**

This test simulates the exact UI flow: pick a term, search, switch to another term, search again. Verifies no stale data leaks between terms.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

interface SearchResult {
  totalCount: number;
  data: {
    term: string;
    subject: string;
    courseNumber: string;
    courseTitle: string;
    summerSession: string;
    courseReferenceNumber: string;
  }[];
}

describe("[integration] Term switching — simulates UI flow", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("switching from fall to summer returns different courses with correct term codes", async () => {
    // Step 1: Search fall
    const fall = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    expect(fall.status).toBe(200);
    expect(fall.data.data.length).toBeGreaterThan(0);

    // Step 2: Search summer (same subject)
    const summer = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    expect(summer.status).toBe(200);
    expect(summer.data.data.length).toBeGreaterThan(0);

    // Step 3: Verify NO fall courses leaked into summer results
    for (const section of summer.data.data) {
      expect(section.term).toBe(TEST_TERMS.summerFull2026);
      expect(section.term).not.toBe(TEST_TERMS.fall2025);
    }

    // Step 4: Verify NO summer courses leaked into fall results
    for (const section of fall.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
  });

  it("switching from summer to spring returns different courses", async () => {
    const summer = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    const spring = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.spring2026}&subject=CS`
    );

    expect(summer.data.data.length).toBeGreaterThan(0);
    expect(spring.data.data.length).toBeGreaterThan(0);

    // All spring results must have the spring term code
    for (const section of spring.data.data) {
      expect(section.term).toBe(TEST_TERMS.spring2026);
    }

    // CRN sets should differ (different offerings per term)
    const summerCRNs = new Set(summer.data.data.map((s) => s.courseReferenceNumber));
    const springCRNs = new Set(spring.data.data.map((s) => s.courseReferenceNumber));
    // At least some CRNs should be unique to each term
    const overlap = [...summerCRNs].filter((crn) => springCRNs.has(crn));
    expect(overlap.length).toBeLessThan(summerCRNs.size);
  });

  it("rapid sequential term switches all return correct data", async () => {
    // Fire 3 searches in quick succession (simulates fast clicking)
    const [fall, spring, summer] = await Promise.all([
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`),
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.spring2026}&subject=CS`),
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`),
    ]);

    // Each result must match its own term — no cross-contamination
    for (const section of fall.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
    for (const section of spring.data.data) {
      expect(section.term).toBe(TEST_TERMS.spring2026);
    }
    for (const section of summer.data.data) {
      expect(section.term).toBe(TEST_TERMS.summerFull2026);
    }
  });

  it("subjects reload correctly after term switch", async () => {
    const fallSubjects = await apiGet<{ code: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    const summerSubjects = await apiGet<{ code: string }[]>(
      `/api/subjects?term=${TEST_TERMS.summerFull2026}`
    );

    // Both should have subjects (not empty)
    expect(fallSubjects.data.length).toBeGreaterThan(0);
    expect(summerSubjects.data.length).toBeGreaterThan(0);

    // Both should include CS
    expect(fallSubjects.data.some((s) => s.code === "CS")).toBe(true);
    expect(summerSubjects.data.some((s) => s.code === "CS")).toBe(true);
  });

  it("campuses reload correctly after term switch", async () => {
    const fallCampuses = await apiGet<{ code: string }[]>(
      `/api/campuses?term=${TEST_TERMS.fall2025}`
    );
    const summerCampuses = await apiGet<{ code: string }[]>(
      `/api/campuses?term=${TEST_TERMS.summerFull2026}`
    );

    expect(fallCampuses.data.length).toBeGreaterThan(0);
    expect(summerCampuses.data.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/integration/term-switching.integration.test.ts --reporter=verbose`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/term-switching.integration.test.ts
git commit -m "test: add term-switching integration tests to catch stale data bugs"
```

---

### Task 6: Add npm script and vitest project config for integration tests

**Files:**
- Modify: `vitest.config.mts`
- Create: `vitest.integration.config.mts`
- Modify: `package.json` (scripts section)

- [ ] **Step 1: Create dedicated integration vitest config**

Create `vitest.integration.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["__tests__/integration/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 20_000,
  },
});
```

Note: no `jsdom` environment needed — these are pure HTTP tests, no DOM.

- [ ] **Step 2: Add npm scripts to `package.json`**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:integration": "vitest run --config vitest.integration.config.mts",
"test:unit": "vitest run --config vitest.config.mts"
```

- [ ] **Step 3: Exclude integration tests from the unit test config**

In `vitest.config.mts`, add an `exclude` so unit tests don't accidentally run integration tests:

```ts
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["__tests__/integration/**"],
  },
});
```

- [ ] **Step 4: Run both test suites to verify separation**

Run: `npm run test:unit -- --reporter=verbose` — should run only 104 unit tests
Run: `npm run test:integration -- --reporter=verbose` — should run only integration tests

- [ ] **Step 5: Commit**

```bash
git add vitest.config.mts vitest.integration.config.mts package.json
git commit -m "feat: separate unit and integration vitest configs with npm scripts"
```

---

### Task 7: Create the agent definition and skill

**Files:**
- Create: `.claude/agents/api-tester.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create `.claude/agents/` directory if needed**

```bash
mkdir -p .claude/agents
```

- [ ] **Step 2: Write the agent definition**

Create `.claude/agents/api-tester.md`:

```markdown
---
name: api-tester
description: Run live integration tests against Banner API routes to verify term switching, course loading, session detection, and data integrity. Requires dev server running on localhost:3000.
model: sonnet
---

# API Integration Tester

You are an API testing agent for the NEU CS Tracker. Your job is to run integration tests that hit the live dev server and verify correctness.

## Pre-flight

1. Check if the dev server is running:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/terms
   ```
   If not 200, tell the caller "Dev server is not running. Start it with `npm run dev` first." and stop.

2. Run the integration test suite:
   ```bash
   cd /Users/joshcho/neu-cs-tracker && npx vitest run --config vitest.integration.config.mts --reporter=verbose
   ```

3. If any tests fail:
   - Read the failing test file to understand what was expected
   - Hit the failing API endpoint manually with curl and inspect the raw response
   - Identify whether the issue is: (a) Banner API returning unexpected data, (b) our route handler bug, (c) summer session detection bug, or (d) stale data / caching
   - Report findings with the raw API response and your diagnosis

4. If all tests pass, report the summary.

## What to check when tests fail

- **Empty data array**: Banner session cookie may not be establishing. Check if the POST to `/term/search` is succeeding.
- **Wrong term in results**: The `term` field on each course section must match the requested term code exactly.
- **All sessions showing "Full"**: The `deriveSummerSession` function may not be getting meeting time dates. Check `meetingsFaculty` array in the raw response.
- **Stale data on term switch**: SWR may be caching. Check if the `queryKey` changes when term changes.
```

- [ ] **Step 3: Update CLAUDE.md to reference the agent**

Append to `CLAUDE.md`:

```markdown

## Agents

### api-tester
Run with: dispatch the `api-tester` agent (or use Agent tool with `.claude/agents/api-tester.md`).
Requires: dev server running (`npm run dev`).
Tests: `__tests__/integration/` — live HTTP tests against Banner API routes.
Use when: courses don't load after term switch, summer session labels are wrong, or API returns empty/stale data.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/api-tester.md CLAUDE.md
git commit -m "feat: add api-tester agent definition for live API integration testing"
```

---

### Task 8: Verify everything works end-to-end

- [ ] **Step 1: Run unit tests (should still be 104 passing, no integration tests mixed in)**

Run: `npm run test:unit -- --reporter=verbose`
Expected: 104 tests pass

- [ ] **Step 2: Start dev server and run integration tests**

Run: `npm run dev &` (or in a separate terminal)
Run: `npm run test:integration -- --reporter=verbose`
Expected: All integration tests pass

- [ ] **Step 3: Final commit if any cleanup needed**
