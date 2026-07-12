# Khoury Grad Planner Phase 1: Schema v2 + Engine v2 + UI + Rebrand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat requirements model with a recursive requirement-tree schema + interpreter engine, migrate the 3 existing MS programs to per-program JSON files, render nested requirements in the UI, and rebrand the app to "Khoury Grad Planner".

**Architecture:** Program data moves from hardcoded TS (`src/lib/requirements.ts`) to JSON files under `src/data/programs/`, validated by a hand-rolled schema validator. A new tree-interpreter engine (`src/lib/requirements-engine.ts`) allocates completed/planned courses to requirement leaves (no double-counting, exact-course-before-range) and evaluates nested statuses. `RequirementChecker` consumes the new engine via a new recursive `RequirementTree` component; a `MilestoneChecklist` component handles PhD milestones / UG NUpath (built now, used by Phase 2 data).

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript (strict), Tailwind CSS 4, Vitest 4 + @testing-library/react, no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-12-khoury-programs-design.md`. This plan covers **sub-project 1 only**; the Khoury research pass (~9 more programs + ProgramPicker) is a separate Phase 2 plan.

## Global Constraints

- App display name after rebrand: **"Khoury Grad Planner"** (nav, landing h1, metadata title, `package.json` name `khoury-grad-planner`).
- localStorage key stays **`neu-cs-tracker:planner`** (do not wipe existing users' data). Legacy persisted program IDs `"MSCS" | "MSAI" | "MSDS"` must map to new IDs `"mscs" | "msai" | "msds"` on hydration.
- New program IDs are lowercase: `mscs`, `msai`, `msds`.
- No new runtime dependencies. Validator is hand-rolled (zod was removed from this repo).
- `tsconfig.json` already has `resolveJsonModule: true` — do not change compiler options.
- Phase 1 is a **structure-preserving migration**: the 3 JSON files encode exactly the courses/groups in today's `requirements.ts` (re-verification against the live catalog is Phase 2). `catalogYear` is `"2024-2026"`, `verifiedAt` is `"2026-07-12"`.
- Graduation pacing: UG ≈ 16 credits/term, MS ≈ 8 credits/term, PhD → no projection (`expectedGraduationTerm: null`).
- All tests must pass at every commit: `npx vitest run`.
- Path alias `@/*` → `./src/*`.

## File Map (end state)

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/program-schema.ts` | v2 types + `validateProgram()` |
| Create | `src/lib/requirements-engine.ts` | allocation + evaluation + `analyzeGraduation()` |
| Create | `src/data/programs/mscs.json`, `msai.json`, `msds.json` | program data |
| Create | `src/data/programs/index.ts` | typed registry (`PROGRAMS`, `PROGRAM_IDS`, `ProgramId`, `LEGACY_PROGRAM_IDS`) |
| Create | `src/components/RequirementTree.tsx` | recursive collapsible requirement rendering |
| Create | `src/components/MilestoneChecklist.tsx` | manual checklist (PhD milestones / UG NUpath) |
| Modify | `src/components/RequirementChecker.tsx` | consume v2 engine/registry, legacy ID mapping, checklist persistence |
| Modify | `src/lib/course-catalog.ts` | build `STATIC_CATALOG` by walking v2 trees |
| Modify | `src/lib/transcript-parser.ts` | `PROGRAM_MAP` → new IDs, `ProgramId` import from registry |
| Delete | `src/lib/requirements.ts` | replaced by engine + data |
| Modify | `src/lib/types.ts` | remove `RequirementCategory`, `RequirementCourse`, `RequirementStatus`, `GraduationAnalysis` |
| Delete | `__tests__/lib/requirements.test.ts` | replaced by engine + data tests |
| Create | `__tests__/lib/program-schema.test.ts`, `__tests__/lib/requirements-engine.test.ts`, `__tests__/lib/programs-data.test.ts`, `__tests__/components/MilestoneChecklist.test.tsx`, `__tests__/components/RequirementTree.test.tsx` | new tests |
| Modify | `__tests__/lib/transcript-parser.test.ts:22-24,156` | expect lowercase IDs |
| Modify | `src/app/layout.tsx`, `src/app/page.tsx`, `package.json`, `CLAUDE.md` | rebrand |

---

### Task 1: Schema v2 types + validator

**Files:**
- Create: `src/lib/program-schema.ts`
- Test: `__tests__/lib/program-schema.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces (used by Tasks 2–8):
  - Types: `RequirementNode`, `CourseNode`, `RangeNode`, `AllOfNode`, `ChooseNNode`, `ChooseCreditsNode`, `Milestone`, `ChecklistItem`, `ProgramLevel`, `ProgramV2`.
  - `validateProgram(input: unknown): string[]` — returns error strings (empty array = valid).

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/program-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateProgram, type ProgramV2 } from "@/lib/program-schema";

const VALID: ProgramV2 = {
  id: "test-ms",
  name: "Test MS",
  level: "MS",
  totalCredits: 32,
  minGpa: 3.0,
  catalogUrl: "https://catalog.northeastern.edu/test/",
  catalogYear: "2024-2026",
  verifiedAt: "2026-07-12",
  requirements: {
    type: "allOf",
    label: "Test MS",
    children: [
      { type: "course", subject: "CS", number: "5800", title: "Algorithms", credits: 4 },
      {
        type: "chooseN",
        label: "Pick one",
        n: 1,
        children: [
          { type: "course", subject: "CS", number: "6140", title: "Machine Learning", credits: 4 },
          { type: "range", subject: "CS", minNumber: 7000, maxNumber: 7999, creditsPer: 4 },
        ],
      },
      {
        type: "chooseCredits",
        label: "Electives",
        credits: 8,
        children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 }],
      },
    ],
  },
};

describe("validateProgram", () => {
  it("accepts a valid program", () => {
    expect(validateProgram(VALID)).toEqual([]);
  });

  it("accepts optional milestones and infoChecklist", () => {
    const p = {
      ...VALID,
      milestones: [{ id: "qual", label: "Qualifying exam", description: "Pass quals" }],
      infoChecklist: [{ id: "nupath-nd", label: "Natural/Designed World" }],
    };
    expect(validateProgram(p)).toEqual([]);
  });

  it("rejects non-objects", () => {
    expect(validateProgram(null).length).toBeGreaterThan(0);
    expect(validateProgram("x").length).toBeGreaterThan(0);
  });

  it("rejects missing top-level fields with the field name in the error", () => {
    const { minGpa: _drop, ...rest } = VALID;
    const errors = validateProgram(rest);
    expect(errors.some((e) => e.includes("minGpa"))).toBe(true);
  });

  it("rejects a bad level", () => {
    const errors = validateProgram({ ...VALID, level: "BS" });
    expect(errors.some((e) => e.includes("level"))).toBe(true);
  });

  it("rejects unknown node types with a path", () => {
    const p = {
      ...VALID,
      requirements: { type: "allOf", label: "Root", children: [{ type: "banana" }] },
    };
    const errors = validateProgram(p);
    expect(errors.some((e) => e.includes("children[0]") && e.includes("banana"))).toBe(true);
  });

  it("rejects a course node with missing/invalid fields", () => {
    const p = {
      ...VALID,
      requirements: {
        type: "allOf",
        label: "Root",
        children: [{ type: "course", subject: "CS", number: "5800", title: "Algorithms", credits: "4" }],
      },
    };
    const errors = validateProgram(p);
    expect(errors.some((e) => e.includes("credits"))).toBe(true);
  });

  it("rejects a chooseN group whose n exceeds its children count", () => {
    const p = {
      ...VALID,
      requirements: {
        type: "chooseN",
        label: "Impossible",
        n: 3,
        children: [{ type: "course", subject: "CS", number: "5800", title: "Algorithms", credits: 4 }],
      },
    };
    const errors = validateProgram(p);
    expect(errors.some((e) => e.includes("n"))).toBe(true);
  });

  it("rejects a range with minNumber > maxNumber", () => {
    const p = {
      ...VALID,
      requirements: { type: "range", subject: "CS", minNumber: 8000, maxNumber: 5000, creditsPer: 4 },
    };
    const errors = validateProgram(p);
    expect(errors.some((e) => e.includes("minNumber"))).toBe(true);
  });

  it("rejects empty group children", () => {
    const p = { ...VALID, requirements: { type: "allOf", label: "Root", children: [] } };
    const errors = validateProgram(p);
    expect(errors.some((e) => e.includes("children"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/program-schema.test.ts`
Expected: FAIL — `Cannot find module '@/lib/program-schema'` (or equivalent).

- [ ] **Step 3: Write the implementation**

Create `src/lib/program-schema.ts`:

```ts
/**
 * Program requirement schema v2 — recursive requirement trees.
 *
 * A requirement is a specific course, an open course range, or a group
 * (allOf / chooseN / chooseCredits) that nests other requirements.
 * Program data lives in src/data/programs/*.json and is validated by
 * validateProgram() in CI (see __tests__/lib/programs-data.test.ts).
 */

export interface CourseNode {
  type: "course";
  subject: string;
  number: string;
  title: string;
  credits: number;
}

export interface RangeNode {
  type: "range";
  subject: string;
  minNumber: number;
  maxNumber: number;
  /** Typical credits of one course in this range (display/estimation only). */
  creditsPer: number;
  label?: string;
}

export interface AllOfNode {
  type: "allOf";
  label: string;
  children: RequirementNode[];
}

export interface ChooseNNode {
  type: "chooseN";
  label: string;
  n: number;
  children: RequirementNode[];
}

export interface ChooseCreditsNode {
  type: "chooseCredits";
  label: string;
  credits: number;
  children: RequirementNode[];
}

export type RequirementNode =
  | CourseNode
  | RangeNode
  | AllOfNode
  | ChooseNNode
  | ChooseCreditsNode;

export interface Milestone {
  id: string;
  label: string;
  description?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export type ProgramLevel = "UG" | "MS" | "PhD";

export interface ProgramV2 {
  id: string;
  name: string;
  level: ProgramLevel;
  totalCredits: number;
  minGpa: number;
  catalogUrl: string;
  catalogYear: string;
  /** ISO date of the last human verification against the catalog. */
  verifiedAt: string;
  requirements: RequirementNode;
  /** PhD only: manual-check milestones (qualifier, proposal, ...). */
  milestones?: Milestone[];
  /** UG only: manual-check info items (NUpath areas). */
  infoChecklist?: ChecklistItem[];
}

// ── Validator ────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function reqString(o: Record<string, unknown>, key: string, path: string, errors: string[]) {
  if (typeof o[key] !== "string" || (o[key] as string).length === 0)
    errors.push(`${path}.${key}: expected non-empty string`);
}

function reqNumber(o: Record<string, unknown>, key: string, path: string, errors: string[]) {
  if (typeof o[key] !== "number" || Number.isNaN(o[key]))
    errors.push(`${path}.${key}: expected number`);
}

function validateNode(v: unknown, path: string, errors: string[]): void {
  if (!isObj(v)) {
    errors.push(`${path}: expected object`);
    return;
  }
  const type = v.type;
  switch (type) {
    case "course":
      reqString(v, "subject", path, errors);
      reqString(v, "number", path, errors);
      reqString(v, "title", path, errors);
      reqNumber(v, "credits", path, errors);
      return;
    case "range":
      reqString(v, "subject", path, errors);
      reqNumber(v, "minNumber", path, errors);
      reqNumber(v, "maxNumber", path, errors);
      reqNumber(v, "creditsPer", path, errors);
      if (
        typeof v.minNumber === "number" &&
        typeof v.maxNumber === "number" &&
        v.minNumber > v.maxNumber
      )
        errors.push(`${path}.minNumber: must be <= maxNumber`);
      return;
    case "allOf":
    case "chooseN":
    case "chooseCredits": {
      reqString(v, "label", path, errors);
      if (type === "chooseN") reqNumber(v, "n", path, errors);
      if (type === "chooseCredits") reqNumber(v, "credits", path, errors);
      if (!Array.isArray(v.children) || v.children.length === 0) {
        errors.push(`${path}.children: expected non-empty array`);
        return;
      }
      if (
        type === "chooseN" &&
        typeof v.n === "number" &&
        v.n > v.children.length
      )
        errors.push(`${path}.n: exceeds children count (${v.children.length})`);
      v.children.forEach((c, i) => validateNode(c, `${path}.children[${i}]`, errors));
      return;
    }
    default:
      errors.push(`${path}: unknown node type '${String(type)}'`);
  }
}

/** Validate an unknown value as a ProgramV2. Returns error strings; [] = valid. */
export function validateProgram(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(input)) return ["program: expected object"];

  reqString(input, "id", "program", errors);
  reqString(input, "name", "program", errors);
  if (input.level !== "UG" && input.level !== "MS" && input.level !== "PhD")
    errors.push("program.level: expected 'UG' | 'MS' | 'PhD'");
  reqNumber(input, "totalCredits", "program", errors);
  reqNumber(input, "minGpa", "program", errors);
  reqString(input, "catalogUrl", "program", errors);
  reqString(input, "catalogYear", "program", errors);
  reqString(input, "verifiedAt", "program", errors);

  validateNode(input.requirements, "program.requirements", errors);

  if (input.milestones !== undefined) {
    if (!Array.isArray(input.milestones)) errors.push("program.milestones: expected array");
    else
      input.milestones.forEach((m, i) => {
        if (!isObj(m)) return errors.push(`program.milestones[${i}]: expected object`);
        reqString(m, "id", `program.milestones[${i}]`, errors);
        reqString(m, "label", `program.milestones[${i}]`, errors);
      });
  }
  if (input.infoChecklist !== undefined) {
    if (!Array.isArray(input.infoChecklist)) errors.push("program.infoChecklist: expected array");
    else
      input.infoChecklist.forEach((m, i) => {
        if (!isObj(m)) return errors.push(`program.infoChecklist[${i}]: expected object`);
        reqString(m, "id", `program.infoChecklist[${i}]`, errors);
        reqString(m, "label", `program.infoChecklist[${i}]`, errors);
      });
  }
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/program-schema.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/program-schema.ts __tests__/lib/program-schema.test.ts
git commit -m "feat: add program schema v2 (recursive requirement trees) with validator"
```

---

### Task 2: Engine — allocation + node evaluation

**Files:**
- Create: `src/lib/requirements-engine.ts`
- Test: `__tests__/lib/requirements-engine.test.ts`

**Interfaces:**
- Consumes: `RequirementNode`, `ProgramV2` from `@/lib/program-schema`; `CompletedCourse`, `PlannedCourse` from `@/lib/types`.
- Produces (used by Tasks 3, 7):
  - `type MatchKind = "completed" | "planned"`
  - `interface CourseMatch { subject: string; courseNumber: string; title: string; credits: number; term: string; kind: MatchKind }`
  - `type NodeState = "complete" | "planned" | "partial" | "missing"`
  - `interface NodeStatus { node: RequirementNode; state: NodeState; earned: number; required: number; unit: "courses" | "credits"; matches: CourseMatch[]; children: NodeStatus[] }`
  - `evaluateTree(root: RequirementNode, completed: CompletedCourse[], planned: PlannedCourse[]): NodeStatus`

Semantics (documented in code):
- Pool = completed courses (in order) then planned courses (in order); each pool entry is consumable **once**.
- Pass 1: exact `course` leaves claim matching pool entries (case-insensitive subject, exact number string), depth-first document order.
- Pass 2: `range` leaves claim remaining pool entries whose subject matches (case-insensitive) and whose number parses into `[minNumber, maxNumber]`. A range directly under `allOf`/`chooseN` claims **at most 1** course; a range under `chooseCredits` claims courses until the group's credit target is met (using each course's **actual** credits).
- Leaf states: `complete` (matched by ≥1 completed course, or all matches completed), `planned` (matched only by planned), `missing`.
- Group states: `chooseN` earned = children in state complete/planned; `allOf` earned = same, required = children.length; `chooseCredits` earned = credits of matched courses in subtree. `complete` if earned ≥ required, `partial` if 0 < earned < required, `missing` if earned = 0.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/requirements-engine.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { evaluateTree } from "@/lib/requirements-engine";
import type { RequirementNode } from "@/lib/program-schema";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";

const done = (subject: string, num: string, credits = 4): CompletedCourse => ({
  subject, courseNumber: num, title: `${subject} ${num}`, credits, term: "202510", grade: "A",
});
const plan = (subject: string, num: string, credits = 4): PlannedCourse => ({
  subject, courseNumber: num, title: `${subject} ${num}`, credits, term: "202630",
});
const course = (subject: string, number: string, credits = 4): RequirementNode => ({
  type: "course", subject, number, title: `${subject} ${number}`, credits,
});

describe("evaluateTree — course leaves", () => {
  it("completed course marks leaf complete with a completed match", () => {
    const s = evaluateTree(course("CS", "5800"), [done("CS", "5800")], []);
    expect(s.state).toBe("complete");
    expect(s.earned).toBe(1);
    expect(s.required).toBe(1);
    expect(s.unit).toBe("courses");
    expect(s.matches).toEqual([
      { subject: "CS", courseNumber: "5800", title: "CS 5800", credits: 4, term: "202510", kind: "completed" },
    ]);
  });

  it("planned course marks leaf planned", () => {
    const s = evaluateTree(course("CS", "5800"), [], [plan("CS", "5800")]);
    expect(s.state).toBe("planned");
    expect(s.matches[0].kind).toBe("planned");
  });

  it("unmatched leaf is missing", () => {
    const s = evaluateTree(course("CS", "5800"), [done("CS", "5010")], []);
    expect(s.state).toBe("missing");
    expect(s.matches).toEqual([]);
  });

  it("subject matching is case-insensitive", () => {
    const s = evaluateTree(course("CS", "5800"), [done("cs", "5800")], []);
    expect(s.state).toBe("complete");
  });

  it("a single completed course cannot satisfy two identical leaves", () => {
    const root: RequirementNode = {
      type: "allOf", label: "Root",
      children: [course("CS", "5800"), course("CS", "5800")],
    };
    const s = evaluateTree(root, [done("CS", "5800")], []);
    expect(s.children[0].state).toBe("complete");
    expect(s.children[1].state).toBe("missing");
  });
});

describe("evaluateTree — allOf", () => {
  const root: RequirementNode = {
    type: "allOf", label: "Core",
    children: [course("CS", "5010"), course("CS", "5800")],
  };

  it("complete when all children matched", () => {
    const s = evaluateTree(root, [done("CS", "5010"), done("CS", "5800")], []);
    expect(s.state).toBe("complete");
    expect(s.earned).toBe(2);
    expect(s.required).toBe(2);
  });

  it("partial when some children matched", () => {
    const s = evaluateTree(root, [done("CS", "5010")], []);
    expect(s.state).toBe("partial");
    expect(s.earned).toBe(1);
  });

  it("missing when none matched", () => {
    const s = evaluateTree(root, [], []);
    expect(s.state).toBe("missing");
  });
});

describe("evaluateTree — chooseN", () => {
  const root: RequirementNode = {
    type: "chooseN", label: "Breadth", n: 2,
    children: [course("CS", "5100"), course("CS", "6140"), course("CS", "6220")],
  };

  it("complete when n children satisfied (planned counts)", () => {
    const s = evaluateTree(root, [done("CS", "5100")], [plan("CS", "6140")]);
    expect(s.state).toBe("complete");
    expect(s.earned).toBe(2);
    expect(s.required).toBe(2);
  });

  it("partial when fewer than n satisfied", () => {
    const s = evaluateTree(root, [done("CS", "6220")], []);
    expect(s.state).toBe("partial");
  });
});

describe("evaluateTree — OR of course sequences (nested allOf under chooseN)", () => {
  const root: RequirementNode = {
    type: "chooseN", label: "Intro sequence", n: 1,
    children: [
      { type: "allOf", label: "CS intro", children: [course("CS", "2500"), course("CS", "2501", 1)] },
      { type: "allOf", label: "DS intro", children: [course("DS", "2000"), course("DS", "2001", 1)] },
    ],
  };

  it("one full sequence satisfies the group", () => {
    const s = evaluateTree(root, [done("DS", "2000"), done("DS", "2001", 1)], []);
    expect(s.state).toBe("complete");
  });

  it("half a sequence leaves the group partial", () => {
    const s = evaluateTree(root, [done("CS", "2500")], []);
    expect(s.state).toBe("partial");
  });
});

describe("evaluateTree — ranges", () => {
  it("range under chooseN claims at most one course", () => {
    const root: RequirementNode = {
      type: "chooseN", label: "One 7000-level", n: 1,
      children: [{ type: "range", subject: "CS", minNumber: 7000, maxNumber: 7999, creditsPer: 4 }],
    };
    const s = evaluateTree(root, [done("CS", "7150"), done("CS", "7140")], []);
    expect(s.state).toBe("complete");
    expect(s.children[0].matches.length).toBe(1);
  });

  it("range under chooseCredits claims courses until credits met, using actual credits", () => {
    const root: RequirementNode = {
      type: "chooseCredits", label: "Electives", credits: 8,
      children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 }],
    };
    const s = evaluateTree(root, [done("CS", "6620"), done("CS", "6650"), done("CS", "7150")], []);
    expect(s.state).toBe("complete");
    expect(s.earned).toBe(8);
    expect(s.unit).toBe("credits");
    expect(s.children[0].matches.length).toBe(2); // stops once 8 credits gathered
  });

  it("exact course leaves claim before ranges", () => {
    const root: RequirementNode = {
      type: "allOf", label: "Root",
      children: [
        { type: "chooseCredits", label: "Electives", credits: 4,
          children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 }] },
        course("CS", "5800"),
      ],
    };
    // Only one CS 5800 in the pool. The exact leaf (later in document order)
    // must win it; the range gets nothing.
    const s = evaluateTree(root, [done("CS", "5800")], []);
    expect(s.children[1].state).toBe("complete");
    expect(s.children[0].state).toBe("missing");
  });

  it("range ignores courses outside its number window or subject", () => {
    const root: RequirementNode = {
      type: "chooseCredits", label: "Electives", credits: 8,
      children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 }],
    };
    const s = evaluateTree(root, [done("CS", "4500"), done("DS", "5230")], []);
    expect(s.state).toBe("missing");
  });
});

describe("evaluateTree — chooseCredits with course children", () => {
  it("counts credits of matched course children", () => {
    const root: RequirementNode = {
      type: "chooseCredits", label: "Depth", credits: 8,
      children: [course("CS", "6140"), course("CS", "7150"), course("CS", "6220")],
    };
    const s = evaluateTree(root, [done("CS", "6140")], [plan("CS", "6220")]);
    expect(s.earned).toBe(8);
    expect(s.state).toBe("complete");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/requirements-engine.test.ts`
Expected: FAIL — `Cannot find module '@/lib/requirements-engine'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/requirements-engine.ts`:

```ts
/**
 * Requirement-tree interpreter (engine v2).
 *
 * Allocation: completed courses (then planned) form a pool; each pool entry
 * is consumed at most once. Exact `course` leaves claim first (depth-first
 * document order), then `range` leaves claim what remains — at most one
 * course when the range sits under allOf/chooseN, or up to the group's
 * credit target when under chooseCredits.
 */

import type {
  ProgramV2,
  RequirementNode,
} from "./program-schema";
import type { CompletedCourse, PlannedCourse } from "./types";

export type MatchKind = "completed" | "planned";

export interface CourseMatch {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
  term: string;
  kind: MatchKind;
}

export type NodeState = "complete" | "planned" | "partial" | "missing";

export interface NodeStatus {
  node: RequirementNode;
  state: NodeState;
  earned: number;
  required: number;
  unit: "courses" | "credits";
  matches: CourseMatch[];
  children: NodeStatus[];
}

interface PoolEntry {
  match: CourseMatch;
  consumed: boolean;
}

function buildPool(completed: CompletedCourse[], planned: PlannedCourse[]): PoolEntry[] {
  const entries: PoolEntry[] = [];
  for (const c of completed)
    entries.push({
      consumed: false,
      match: { subject: c.subject, courseNumber: c.courseNumber, title: c.title, credits: c.credits, term: c.term, kind: "completed" },
    });
  for (const p of planned)
    entries.push({
      consumed: false,
      match: { subject: p.subject, courseNumber: p.courseNumber, title: p.title, credits: p.credits, term: p.term, kind: "planned" },
    });
  return entries;
}

/** Pass 1: exact course leaves claim pool entries, depth-first. */
function allocateExact(node: RequirementNode, pool: PoolEntry[], leafMatches: Map<RequirementNode, CourseMatch[]>): void {
  if (node.type === "course") {
    const entry = pool.find(
      (e) => !e.consumed &&
        e.match.subject.toUpperCase() === node.subject.toUpperCase() &&
        e.match.courseNumber === node.number
    );
    if (entry) {
      entry.consumed = true;
      leafMatches.set(node, [entry.match]);
    }
    return;
  }
  if (node.type === "range") return;
  for (const child of node.children) allocateExact(child, pool, leafMatches);
}

function rangeMatches(node: Extract<RequirementNode, { type: "range" }>, e: PoolEntry): boolean {
  if (e.consumed) return false;
  if (e.match.subject.toUpperCase() !== node.subject.toUpperCase()) return false;
  const num = parseInt(e.match.courseNumber, 10);
  return !Number.isNaN(num) && num >= node.minNumber && num <= node.maxNumber;
}

/**
 * Pass 2: range leaves claim remaining pool entries. `creditBudget` is the
 * enclosing chooseCredits target still unmet (Infinity outside chooseCredits
 * means "claim at most one").
 */
function allocateRanges(
  node: RequirementNode,
  pool: PoolEntry[],
  leafMatches: Map<RequirementNode, CourseMatch[]>,
  creditBudget: { remaining: number } | null
): void {
  if (node.type === "course") return;
  if (node.type === "range") {
    const matches: CourseMatch[] = [];
    if (creditBudget) {
      for (const e of pool) {
        if (creditBudget.remaining <= 0) break;
        if (rangeMatches(node, e)) {
          e.consumed = true;
          creditBudget.remaining -= e.match.credits;
          matches.push(e.match);
        }
      }
    } else {
      const e = pool.find((x) => rangeMatches(node, x));
      if (e) {
        e.consumed = true;
        matches.push(e.match);
      }
    }
    if (matches.length) leafMatches.set(node, matches);
    return;
  }
  if (node.type === "chooseCredits") {
    // Course children were already handled in pass 1; subtract their credits.
    let earned = 0;
    for (const child of node.children) {
      if (child.type === "course") earned += (leafMatches.get(child) ?? []).reduce((s, m) => s + m.credits, 0);
    }
    const budget = { remaining: node.credits - earned };
    for (const child of node.children) allocateRanges(child, pool, leafMatches, budget);
    return;
  }
  for (const child of node.children) allocateRanges(child, pool, leafMatches, null);
}

function subtreeCredits(status: NodeStatus): number {
  const own = status.matches.reduce((s, m) => s + m.credits, 0);
  return own + status.children.reduce((s, c) => s + subtreeCredits(c), 0);
}

function evaluate(node: RequirementNode, leafMatches: Map<RequirementNode, CourseMatch[]>): NodeStatus {
  if (node.type === "course" || node.type === "range") {
    const matches = leafMatches.get(node) ?? [];
    const state: NodeState =
      matches.length === 0 ? "missing"
      : matches.some((m) => m.kind === "completed") ? "complete"
      : "planned";
    return {
      node, state,
      earned: matches.length > 0 ? 1 : 0,
      required: 1,
      unit: "courses",
      matches,
      children: [],
    };
  }

  const children = node.children.map((c) => evaluate(c, leafMatches));
  const satisfiedChildren = children.filter((c) => c.state === "complete" || c.state === "planned").length;

  if (node.type === "chooseCredits") {
    const earned = children.reduce((s, c) => s + subtreeCredits(c), 0);
    const state: NodeState =
      earned >= node.credits ? "complete" : earned > 0 ? "partial" : "missing";
    return { node, state, earned, required: node.credits, unit: "credits", matches: [], children };
  }

  const required = node.type === "chooseN" ? node.n : node.children.length;
  const anyProgress = satisfiedChildren > 0 || children.some((c) => c.state === "partial");
  const state: NodeState =
    satisfiedChildren >= required ? "complete" : anyProgress ? "partial" : "missing";
  return { node, state, earned: satisfiedChildren, required, unit: "courses", matches: [], children };
}

export function evaluateTree(
  root: RequirementNode,
  completed: CompletedCourse[],
  planned: PlannedCourse[]
): NodeStatus {
  const pool = buildPool(completed, planned);
  const leafMatches = new Map<RequirementNode, CourseMatch[]>();
  allocateExact(root, pool, leafMatches);
  allocateRanges(root, pool, leafMatches, null);
  return evaluate(root, leafMatches);
}

// analyzeGraduation and term helpers are added in the next task.
export type { ProgramV2 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/requirements-engine.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/requirements-engine.ts __tests__/lib/requirements-engine.test.ts
git commit -m "feat: add requirement-tree engine core (allocation + evaluation)"
```

---

### Task 3: Engine — analysis summary (credits, missing list, graduation term)

**Files:**
- Modify: `src/lib/requirements-engine.ts` (append)
- Test: `__tests__/lib/requirements-engine.test.ts` (append)

**Interfaces:**
- Consumes: `evaluateTree`, `NodeStatus` from Task 2.
- Produces (used by Task 7):
  - `interface MissingItem { label: string; detail: string }`
  - `interface AnalysisV2 { program: ProgramV2; totalCreditsRequired: number; totalCreditsCompleted: number; totalCreditsPlanned: number; totalCreditsRemaining: number; root: NodeStatus; missing: MissingItem[]; expectedGraduationTerm: string | null; onTrack: boolean }`
  - `analyzeGraduation(program: ProgramV2, completed: CompletedCourse[], planned: PlannedCourse[]): AnalysisV2`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/lib/requirements-engine.test.ts`:

```ts
import { analyzeGraduation } from "@/lib/requirements-engine";
import type { ProgramV2 } from "@/lib/program-schema";

const MINI_MS: ProgramV2 = {
  id: "mini-ms", name: "Mini MS", level: "MS", totalCredits: 12, minGpa: 3.0,
  catalogUrl: "https://catalog.northeastern.edu/x/", catalogYear: "2024-2026", verifiedAt: "2026-07-12",
  requirements: {
    type: "allOf", label: "Mini MS",
    children: [
      course("CS", "5800"),
      { type: "chooseN", label: "Breadth", n: 1, children: [course("CS", "6140"), course("CS", "6220")] },
    ],
  },
};

describe("analyzeGraduation — credits and onTrack", () => {
  it("empty inputs: all credits remaining, not on track, no grad term", () => {
    const a = analyzeGraduation(MINI_MS, [], []);
    expect(a.totalCreditsRequired).toBe(12);
    expect(a.totalCreditsCompleted).toBe(0);
    expect(a.totalCreditsPlanned).toBe(0);
    expect(a.totalCreditsRemaining).toBe(12);
    expect(a.onTrack).toBe(false);
    expect(a.expectedGraduationTerm).toBeNull();
  });

  it("sums completed and planned credits; remaining never negative", () => {
    const a = analyzeGraduation(
      MINI_MS,
      [done("CS", "5800"), done("CS", "6140")],
      [plan("CS", "7150"), plan("CS", "7140")]
    );
    expect(a.totalCreditsCompleted).toBe(8);
    expect(a.totalCreditsPlanned).toBe(8);
    expect(a.totalCreditsRemaining).toBe(0);
  });

  it("onTrack requires root complete AND zero remaining credits", () => {
    const requirementsMet = analyzeGraduation(MINI_MS, [done("CS", "5800"), done("CS", "6140")], []);
    expect(requirementsMet.root.state).toBe("complete");
    expect(requirementsMet.onTrack).toBe(false); // 4 credits still remaining
    const all = analyzeGraduation(MINI_MS, [done("CS", "5800"), done("CS", "6140"), done("CS", "7000")], []);
    expect(all.onTrack).toBe(true);
  });
});

describe("analyzeGraduation — missing list", () => {
  it("lists unmet required leaves and unmet groups with shortfall detail", () => {
    const a = analyzeGraduation(MINI_MS, [], []);
    expect(a.missing).toEqual([
      { label: "CS 5800 — CS 5800", detail: "required" },
      { label: "Breadth", detail: "1 more course" },
    ]);
  });

  it("does not list satisfied groups", () => {
    const a = analyzeGraduation(MINI_MS, [done("CS", "6140")], []);
    expect(a.missing).toEqual([{ label: "CS 5800 — CS 5800", detail: "required" }]);
  });

  it("credit-group shortfall is reported in credits", () => {
    const p: ProgramV2 = {
      ...MINI_MS,
      requirements: {
        type: "chooseCredits", label: "Electives", credits: 8,
        children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 }],
      },
    };
    const a = analyzeGraduation(p, [done("CS", "6620")], []);
    expect(a.missing).toEqual([{ label: "Electives", detail: "4 more credits" }]);
  });
});

describe("analyzeGraduation — expected graduation term by level", () => {
  it("MS paces at 8 credits/term", () => {
    // 12-credit program, 4 credits done in Spring 2025 → 8 remaining → 1 more term → Fall 2025
    const a = analyzeGraduation(MINI_MS, [done("CS", "5800")], []);
    expect(a.expectedGraduationTerm).toBe("Fall 2025");
  });

  it("UG paces at 16 credits/term", () => {
    const ug: ProgramV2 = { ...MINI_MS, id: "mini-ug", level: "UG", totalCredits: 36 };
    // 4 done in Spring 2025 → 32 remaining → 2 terms → Fall 2025, Spring 2026
    const a = analyzeGraduation(ug, [done("CS", "5800")], []);
    expect(a.expectedGraduationTerm).toBe("Spring 2026");
  });

  it("PhD has no projection", () => {
    const phd: ProgramV2 = { ...MINI_MS, id: "mini-phd", level: "PhD" };
    const a = analyzeGraduation(phd, [done("CS", "5800")], []);
    expect(a.expectedGraduationTerm).toBeNull();
  });

  it("last course term is the grad term when nothing remains", () => {
    const a = analyzeGraduation(
      MINI_MS,
      [done("CS", "5800"), done("CS", "6140")],
      [{ ...plan("CS", "7150"), term: "202630" }]
    );
    expect(a.expectedGraduationTerm).toBe("Fall 2026");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run __tests__/lib/requirements-engine.test.ts`
Expected: FAIL — `analyzeGraduation` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/requirements-engine.ts` (replace the trailing `export type { ProgramV2 };` line):

```ts
// ── Analysis summary ─────────────────────────────────────────────────────────

export interface MissingItem {
  label: string;
  detail: string;
}

export interface AnalysisV2 {
  program: ProgramV2;
  totalCreditsRequired: number;
  totalCreditsCompleted: number;
  totalCreditsPlanned: number;
  totalCreditsRemaining: number;
  root: NodeStatus;
  missing: MissingItem[];
  expectedGraduationTerm: string | null;
  onTrack: boolean;
}

function termToSortKey(termCode: string): number {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  const order: Record<string, number> = { "10": 1, "40": 2, "50": 2, "60": 3, "30": 4 };
  return year * 10 + (order[suffix] ?? 5);
}

function termDescription(termCode: string): string {
  const year = termCode.slice(0, 4);
  const suffix = termCode.slice(-2);
  const map: Record<string, string> = {
    "10": "Spring", "30": "Fall", "40": "Summer 1", "50": "Summer", "60": "Summer 2",
  };
  return `${map[suffix] ?? suffix} ${year}`;
}

function nextTerm(termCode: string): string {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  if (suffix === "10") return `${year}30`;
  if (suffix === "30") return `${year + 1}10`;
  if (suffix === "40") return `${year}60`;
  if (suffix === "60") return `${year}30`;
  if (suffix === "50") return `${year}30`;
  return `${year + 1}10`;
}

/**
 * Collect actionable gaps: unmet course leaves that are strictly required
 * (direct child of an allOf chain from the root) and unmet groups (with
 * their shortfall). Options inside an unmet chooseN/chooseCredits are not
 * listed individually — the group entry covers them.
 */
function collectMissing(status: NodeStatus, out: MissingItem[], underAllOf: boolean): void {
  const node = status.node;
  if (node.type === "course") {
    if (underAllOf && status.state === "missing")
      out.push({ label: `${node.subject} ${node.number} — ${node.title}`, detail: "required" });
    return;
  }
  if (node.type === "range") return;
  if (node.type === "allOf") {
    for (const child of status.children) collectMissing(child, out, true);
    return;
  }
  // chooseN / chooseCredits
  if (status.state !== "complete") {
    const shortfall = status.required - status.earned;
    out.push({
      label: node.label,
      detail: status.unit === "credits"
        ? `${shortfall} more credit${shortfall === 1 ? "" : "s"}`
        : `${shortfall} more course${shortfall === 1 ? "" : "s"}`,
    });
  }
}

const CREDITS_PER_TERM: Record<ProgramV2["level"], number | null> = {
  UG: 16,
  MS: 8,
  PhD: null,
};

export function analyzeGraduation(
  program: ProgramV2,
  completed: CompletedCourse[],
  planned: PlannedCourse[]
): AnalysisV2 {
  const root = evaluateTree(program.requirements, completed, planned);

  const totalCreditsCompleted = completed.reduce((s, c) => s + c.credits, 0);
  const totalCreditsPlanned = planned.reduce((s, c) => s + c.credits, 0);
  const totalCreditsRemaining = Math.max(
    0,
    program.totalCredits - totalCreditsCompleted - totalCreditsPlanned
  );

  const missing: MissingItem[] = [];
  collectMissing(root, missing, program.requirements.type === "allOf" ? false : true);
  // Root allOf's own children are handled inside collectMissing via recursion;
  // if the root itself is a group other than allOf, collectMissing above
  // already treats it as a group.
  if (program.requirements.type === "allOf") collectMissing(root, missing, false);

  const onTrack = root.state === "complete" && totalCreditsRemaining === 0;

  let expectedGraduationTerm: string | null = null;
  const pace = CREDITS_PER_TERM[program.level];
  const allTerms = [...completed.map((c) => c.term), ...planned.map((c) => c.term)];
  if (pace !== null && allTerms.length > 0) {
    const lastTerm = allTerms.sort((a, b) => termToSortKey(b) - termToSortKey(a))[0];
    if (totalCreditsRemaining <= 0) {
      expectedGraduationTerm = termDescription(lastTerm);
    } else {
      const termsNeeded = Math.ceil(totalCreditsRemaining / pace);
      let term = lastTerm;
      for (let i = 0; i < termsNeeded; i++) term = nextTerm(term);
      expectedGraduationTerm = termDescription(term);
    }
  }

  return {
    program,
    totalCreditsRequired: program.totalCredits,
    totalCreditsCompleted,
    totalCreditsPlanned,
    totalCreditsRemaining,
    root,
    missing,
    expectedGraduationTerm,
    onTrack,
  };
}
```

**Note on `collectMissing` wiring:** the double call above is wrong by inspection — replace the two `collectMissing` calls with exactly one:

```ts
  const missing: MissingItem[] = [];
  collectMissing(root, missing, false);
```

(`collectMissing` already recurses into allOf children with `underAllOf: true`; a non-allOf root is handled by its own group branch. A root-level bare course leaf is not a realistic program, so `underAllOf: false` at the root is fine.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/requirements-engine.test.ts`
Expected: PASS (26 tests). If the missing-list tests fail on ordering, ensure `collectMissing` visits children in document order (it does — `status.children` preserves order).

- [ ] **Step 5: Commit**

```bash
git add src/lib/requirements-engine.ts __tests__/lib/requirements-engine.test.ts
git commit -m "feat: add analyzeGraduation v2 (credits, missing list, level-paced grad term)"
```

---

### Task 4: Program data — mscs/msai/msds JSON + registry

**Files:**
- Create: `src/data/programs/mscs.json`
- Create: `src/data/programs/msai.json`
- Create: `src/data/programs/msds.json`
- Create: `src/data/programs/index.ts`
- Test: `__tests__/lib/programs-data.test.ts`

**Interfaces:**
- Consumes: `ProgramV2`, `validateProgram` from Task 1.
- Produces (used by Tasks 5–8):
  - `PROGRAM_IDS: readonly ["mscs", "msai", "msds"]`
  - `type ProgramId = (typeof PROGRAM_IDS)[number]`
  - `PROGRAMS: Record<ProgramId, ProgramV2>`
  - `LEGACY_PROGRAM_IDS: Record<string, ProgramId>` — `{ MSCS: "mscs", MSAI: "msai", MSDS: "msds" }`
  - `isProgramId(v: string): v is ProgramId`

**Migration note:** the JSON encodes exactly the courses/groups from `src/lib/requirements.ts` (structure-preserving). Course lists below are copied verbatim from that file — do not add or drop courses.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/programs-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PROGRAMS, PROGRAM_IDS, LEGACY_PROGRAM_IDS, isProgramId } from "@/data/programs";
import { validateProgram, type RequirementNode } from "@/lib/program-schema";

function collectCourses(node: RequirementNode, out: Set<string>): void {
  if (node.type === "course") { out.add(`${node.subject} ${node.number}`); return; }
  if (node.type === "range") return;
  for (const c of node.children) collectCourses(c, out);
}

describe("programs registry", () => {
  it("contains exactly mscs, msai, msds", () => {
    expect([...PROGRAM_IDS]).toEqual(["mscs", "msai", "msds"]);
    expect(Object.keys(PROGRAMS).sort()).toEqual(["msai", "mscs", "msds"]);
  });

  it("every program passes schema validation", () => {
    for (const id of PROGRAM_IDS) {
      expect(validateProgram(PROGRAMS[id]), `program ${id}`).toEqual([]);
    }
  });

  it("ids are consistent and levels are MS with 32 credits", () => {
    for (const id of PROGRAM_IDS) {
      expect(PROGRAMS[id].id).toBe(id);
      expect(PROGRAMS[id].level).toBe("MS");
      expect(PROGRAMS[id].totalCredits).toBe(32);
      expect(PROGRAMS[id].catalogUrl).toMatch(/^https:\/\/catalog\.northeastern\.edu\//);
    }
  });

  it("mscs keeps its migrated structure (core + 3 breadth groups)", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.mscs.requirements, courses);
    expect(courses.has("CS 5010")).toBe(true);
    expect(courses.has("CS 5800")).toBe(true);
    expect(courses.has("CS 6140")).toBe(true); // AI/DS breadth
    expect(courses.has("CS 5600")).toBe(true); // Systems breadth
    expect(courses.has("CY 6740")).toBe(true); // Theory/Security breadth
    expect(courses.size).toBe(27);
  });

  it("msai keeps its migrated structure", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.msai.requirements, courses);
    expect(courses.has("CS 5100")).toBe(true);
    expect(courses.has("CS 5130")).toBe(true);
    expect(courses.has("DADS 5200")).toBe(true);
    expect(courses.has("EECE 5644")).toBe(true);
    expect(courses.size).toBe(17);
  });

  it("msds keeps its migrated structure", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.msds.requirements, courses);
    expect(courses.has("DS 5110")).toBe(true);
    expect(courses.has("DS 5500")).toBe(true);
    expect(courses.has("CS 7250")).toBe(true);
    expect(courses.size).toBe(25);
  });

  it("legacy uppercase ids map to new ids", () => {
    expect(LEGACY_PROGRAM_IDS).toEqual({ MSCS: "mscs", MSAI: "msai", MSDS: "msds" });
  });

  it("isProgramId narrows correctly", () => {
    expect(isProgramId("mscs")).toBe(true);
    expect(isProgramId("MSCS")).toBe(false);
    expect(isProgramId("bscs")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/programs-data.test.ts`
Expected: FAIL — `Cannot find module '@/data/programs'`.

- [ ] **Step 3: Create the three JSON files**

Create `src/data/programs/mscs.json`:

```json
{
  "id": "mscs",
  "name": "MS Computer Science (MSCS)",
  "level": "MS",
  "totalCredits": 32,
  "minGpa": 3.0,
  "catalogUrl": "https://catalog.northeastern.edu/graduate/computer-information-science/computer-science/computer-science-mscs/",
  "catalogYear": "2024-2026",
  "verifiedAt": "2026-07-12",
  "requirements": {
    "type": "allOf",
    "label": "MS in Computer Science",
    "children": [
      {
        "type": "allOf",
        "label": "Core",
        "children": [
          { "type": "course", "subject": "CS", "number": "5010", "title": "Programming Design Paradigm", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5800", "title": "Algorithms", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Breadth: AI & Data Science",
        "n": 1,
        "children": [
          { "type": "course", "subject": "CS", "number": "5100", "title": "Foundations of Artificial Intelligence", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5150", "title": "Game Artificial Intelligence", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5200", "title": "Database Management Systems", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5330", "title": "Pattern Recognition and Computer Vision", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6120", "title": "Natural Language Processing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6140", "title": "Machine Learning", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6200", "title": "Information Retrieval", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6220", "title": "Data Mining Techniques", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6240", "title": "Large-Scale Parallel Data Processing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7140", "title": "Advanced Machine Learning", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Breadth: Systems & Software",
        "n": 1,
        "children": [
          { "type": "course", "subject": "CS", "number": "5400", "title": "Principles of Programming Language", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5500", "title": "Foundations of Software Engineering", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5520", "title": "Mobile Application Development", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5600", "title": "Computer Systems", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5610", "title": "Web Development", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5700", "title": "Fundamentals of Computer Networking", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5850", "title": "Building Game Engines", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6410", "title": "Compilers", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6510", "title": "Advanced Software Development", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6620", "title": "Fundamentals of Cloud Computing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6650", "title": "Building Scalable Distributed Systems", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Breadth: Theory & Security",
        "n": 1,
        "children": [
          { "type": "course", "subject": "CS", "number": "6760", "title": "Privacy, Security, and Usability", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7805", "title": "Complexity Theory", "credits": 4 },
          { "type": "course", "subject": "CY", "number": "5770", "title": "Software Vulnerabilities and Security", "credits": 4 },
          { "type": "course", "subject": "CY", "number": "6740", "title": "Network Security", "credits": 4 }
        ]
      }
    ]
  }
}
```

Create `src/data/programs/msai.json`:

```json
{
  "id": "msai",
  "name": "MS Artificial Intelligence (MSAI)",
  "level": "MS",
  "totalCredits": 32,
  "minGpa": 3.0,
  "catalogUrl": "https://catalog.northeastern.edu/graduate/computer-information-science/artificial-intelligence/artificial-intelligence-ms/",
  "catalogYear": "2024-2026",
  "verifiedAt": "2026-07-12",
  "requirements": {
    "type": "allOf",
    "label": "MS in Artificial Intelligence",
    "children": [
      {
        "type": "allOf",
        "label": "Core",
        "children": [
          { "type": "course", "subject": "CS", "number": "5100", "title": "Foundations of Artificial Intelligence", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5130", "title": "Applied Programming and Data Processing for AI", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Core Math (choose 1)",
        "n": 1,
        "children": [
          { "type": "course", "subject": "DADS", "number": "5200", "title": "Mathematics for Machine Learning", "credits": 4 },
          { "type": "course", "subject": "DS", "number": "5020", "title": "Linear Algebra and Probability for Data Science", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Core Machine Learning (choose 1)",
        "n": 1,
        "children": [
          { "type": "course", "subject": "EECE", "number": "5644", "title": "Intro to Machine Learning and Pattern Recognition", "credits": 4 },
          { "type": "course", "subject": "DADS", "number": "7275", "title": "Machine Learning and Data Analytics", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Specialization (choose 2 from one area)",
        "n": 2,
        "children": [
          { "type": "course", "subject": "CS", "number": "5330", "title": "Pattern Recognition and Computer Vision", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "5639", "title": "Computer Vision", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "7370", "title": "Advanced Computer Vision", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7140", "title": "Advanced Machine Learning", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7150", "title": "Deep Learning", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6220", "title": "Data Mining Techniques", "credits": 4 },
          { "type": "course", "subject": "DS", "number": "5230", "title": "Unsupervised Machine Learning and Data Mining", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5180", "title": "Reinforcement Learning and Sequential Decision Making", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5335", "title": "Robotic Science and Systems", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "5550", "title": "Mobile Robotics", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "5554", "title": "Robotics Sensing and Navigation", "credits": 4 }
        ]
      }
    ]
  }
}
```

Create `src/data/programs/msds.json`:

```json
{
  "id": "msds",
  "name": "MS Data Science (MSDS)",
  "level": "MS",
  "totalCredits": 32,
  "minGpa": 3.0,
  "catalogUrl": "https://catalog.northeastern.edu/graduate/computer-information-science/data-science/data-science-ms/",
  "catalogYear": "2024-2026",
  "verifiedAt": "2026-07-12",
  "requirements": {
    "type": "allOf",
    "label": "MS in Data Science",
    "children": [
      {
        "type": "allOf",
        "label": "Core",
        "children": [
          { "type": "course", "subject": "DS", "number": "5110", "title": "Essentials of Data Science", "credits": 4 },
          { "type": "course", "subject": "DS", "number": "5500", "title": "Data Science Capstone", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Core Algorithms (choose 1)",
        "n": 1,
        "children": [
          { "type": "course", "subject": "CS", "number": "5800", "title": "Algorithms", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "7205", "title": "Fundamentals of Computer Engineering", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "Core Machine Learning (choose 1)",
        "n": 1,
        "children": [
          { "type": "course", "subject": "CS", "number": "6140", "title": "Machine Learning", "credits": 4 },
          { "type": "course", "subject": "EECE", "number": "5644", "title": "Intro to Machine Learning and Pattern Recognition", "credits": 4 }
        ]
      },
      {
        "type": "chooseN",
        "label": "CS Concentration (choose 4)",
        "n": 4,
        "children": [
          { "type": "course", "subject": "CS", "number": "5100", "title": "Foundations of Artificial Intelligence", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5180", "title": "Reinforcement Learning and Sequential Decision Making", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5200", "title": "Database Management Systems", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5330", "title": "Pattern Recognition and Computer Vision", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5340", "title": "Computer/Human Interaction", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "5610", "title": "Web Development", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6120", "title": "Natural Language Processing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6200", "title": "Information Retrieval", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6220", "title": "Data Mining Techniques", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6240", "title": "Large-Scale Parallel Data Processing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6350", "title": "Empirical Research Methods", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6620", "title": "Fundamentals of Cloud Computing", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "6650", "title": "Building Scalable Distributed Systems", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7140", "title": "Advanced Machine Learning", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7150", "title": "Deep Learning", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7180", "title": "Special Topics in Artificial Intelligence", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7200", "title": "Statistical Methods for Computer Science", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7250", "title": "Information Visualization", "credits": 4 },
          { "type": "course", "subject": "CS", "number": "7290", "title": "Special Topics in Data Science", "credits": 4 }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Create the registry**

Create `src/data/programs/index.ts`:

```ts
/**
 * Program registry. Each program is a hand-authored JSON file conforming to
 * ProgramV2 (src/lib/program-schema.ts); __tests__/lib/programs-data.test.ts
 * validates every file in CI. Phase 2 adds the remaining Khoury programs.
 */

import type { ProgramV2 } from "@/lib/program-schema";
import mscs from "./mscs.json";
import msai from "./msai.json";
import msds from "./msds.json";

export const PROGRAM_IDS = ["mscs", "msai", "msds"] as const;
export type ProgramId = (typeof PROGRAM_IDS)[number];

export const PROGRAMS: Record<ProgramId, ProgramV2> = {
  mscs: mscs as unknown as ProgramV2,
  msai: msai as unknown as ProgramV2,
  msds: msds as unknown as ProgramV2,
};

/** Pre-rename planner state used uppercase ids; map them on hydration. */
export const LEGACY_PROGRAM_IDS: Record<string, ProgramId> = {
  MSCS: "mscs",
  MSAI: "msai",
  MSDS: "msds",
};

export function isProgramId(v: string): v is ProgramId {
  return (PROGRAM_IDS as readonly string[]).includes(v);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/programs-data.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/programs __tests__/lib/programs-data.test.ts
git commit -m "feat: migrate MSCS/MSAI/MSDS to program JSON files + typed registry"
```

---

### Task 5: Rewire course-catalog to the v2 registry

**Files:**
- Modify: `src/lib/course-catalog.ts:1-22`
- Test: `__tests__/lib/course-catalog.test.ts` (existing — must keep passing unchanged)

**Interfaces:**
- Consumes: `PROGRAMS` from `@/data/programs`; `RequirementNode` from `@/lib/program-schema`.
- Produces: `STATIC_CATALOG`, `searchCatalog`, `parseCourseCode` — signatures unchanged.

- [ ] **Step 1: Replace the catalog builder**

In `src/lib/course-catalog.ts`, replace the import and `buildCatalog` (lines 1–22) with:

```ts
import { PROGRAMS } from "@/data/programs";
import type { RequirementNode } from "@/lib/program-schema";

export interface CatalogCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
}

function collectCourses(node: RequirementNode, seen: Map<string, CatalogCourse>): void {
  if (node.type === "course") {
    const key = `${node.subject} ${node.number}`;
    if (!seen.has(key)) {
      seen.set(key, { subject: node.subject, courseNumber: node.number, title: node.title, credits: node.credits });
    }
    return;
  }
  if (node.type === "range") return;
  for (const child of node.children) collectCourses(child, seen);
}

function buildCatalog(): CatalogCourse[] {
  const seen = new Map<string, CatalogCourse>();
  for (const program of Object.values(PROGRAMS)) {
    collectCourses(program.requirements, seen);
  }
  return [...seen.values()];
}
```

Everything below `export const STATIC_CATALOG` stays byte-identical.

- [ ] **Step 2: Run the existing tests**

Run: `npx vitest run __tests__/lib/course-catalog.test.ts`
Expected: PASS unchanged (catalog contains the same deduped courses).

- [ ] **Step 3: Commit**

```bash
git add src/lib/course-catalog.ts
git commit -m "refactor: build course catalog from v2 program trees"
```

---

### Task 6: Transcript parser — new program IDs

**Files:**
- Modify: `src/lib/transcript-parser.ts:1-28`
- Modify: `__tests__/lib/transcript-parser.test.ts:22-24,156`

**Interfaces:**
- Consumes: `ProgramId` from `@/data/programs` (no longer from `@/lib/requirements`).
- Produces: `programToId(program: string): ProgramId | undefined` — signature unchanged, now returns lowercase IDs.

- [ ] **Step 1: Update the failing expectations first**

In `__tests__/lib/transcript-parser.test.ts` lines 22–24 replace:

```ts
    expect(programToId("M.S. in Computer Science")).toBe("mscs");
    expect(programToId("M.S. in Artificial Intelligence")).toBe("msai");
    expect(programToId("M.S. in Data Science")).toBe("msds");
```

Line 156 replace:

```ts
  it("detects the program", () => { expect(r.program).toBe("mscs"); });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: FAIL — received `"MSCS"`, expected `"mscs"` (and the import may still resolve to the old module).

- [ ] **Step 3: Update the parser**

In `src/lib/transcript-parser.ts`, replace line 5 (`import type { ProgramId } from "@/lib/requirements";`) with:

```ts
import type { ProgramId } from "@/data/programs";
```

Replace the `PROGRAM_MAP` block (lines 20–24) with:

```ts
const PROGRAM_MAP: Record<string, ProgramId> = {
  "m.s. in computer science": "mscs",
  "m.s. in artificial intelligence": "msai",
  "m.s. in data science": "msds",
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run __tests__/lib/transcript-parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcript-parser.ts __tests__/lib/transcript-parser.test.ts
git commit -m "refactor: transcript parser emits v2 program ids"
```

---

### Task 7: RequirementTree component + RequirementChecker integration

**Files:**
- Create: `src/components/RequirementTree.tsx`
- Modify: `src/components/RequirementChecker.tsx`
- Test: `__tests__/components/RequirementTree.test.tsx`

**Interfaces:**
- Consumes: `NodeStatus`, `AnalysisV2`, `analyzeGraduation` from Task 3; `PROGRAMS`, `PROGRAM_IDS`, `ProgramId`, `LEGACY_PROGRAM_IDS`, `isProgramId` from Task 4.
- Produces: `<RequirementTree status={NodeStatus} />` (used by RequirementChecker); persisted planner shape gains `milestoneChecks`/`nupathChecks` (used by Task 8).

- [ ] **Step 1: Write the failing component test**

Create `__tests__/components/RequirementTree.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequirementTree } from "@/components/RequirementTree";
import { evaluateTree } from "@/lib/requirements-engine";
import type { RequirementNode } from "@/lib/program-schema";

const TREE: RequirementNode = {
  type: "allOf",
  label: "Mini MS",
  children: [
    { type: "course", subject: "CS", number: "5800", title: "Algorithms", credits: 4 },
    {
      type: "chooseN", label: "Breadth", n: 1,
      children: [
        { type: "course", subject: "CS", number: "6140", title: "Machine Learning", credits: 4 },
        { type: "course", subject: "CS", number: "6220", title: "Data Mining Techniques", credits: 4 },
      ],
    },
  ],
};

function statusFor(completedNums: string[]) {
  const completed = completedNums.map((n) => ({
    subject: "CS", courseNumber: n, title: `CS ${n}`, credits: 4, term: "202510", grade: "A",
  }));
  return evaluateTree(TREE, completed, []);
}

describe("RequirementTree", () => {
  it("renders group labels with progress counts", () => {
    render(<RequirementTree status={statusFor(["6140"])} />);
    expect(screen.getByText("Breadth")).toBeDefined();
    expect(screen.getByText("1 of 1")).toBeDefined();      // chooseN satisfied
    expect(screen.getByText("1 of 2")).toBeDefined();      // root allOf partial
  });

  it("renders course leaves with code and title", () => {
    render(<RequirementTree status={statusFor([])} />);
    expect(screen.getByText("CS 5800")).toBeDefined();
    expect(screen.getByText("Algorithms")).toBeDefined();
  });

  it("collapses a group when its header is clicked", () => {
    render(<RequirementTree status={statusFor([])} />);
    expect(screen.getByText("CS 6140")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Breadth/ }));
    expect(screen.queryByText("CS 6140")).toBeNull();
  });

  it("shows credit progress for chooseCredits groups", () => {
    const tree: RequirementNode = {
      type: "chooseCredits", label: "Electives", credits: 8,
      children: [{ type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4, label: "Any CS 5000–7999" }],
    };
    const completed = [{ subject: "CS", courseNumber: "6620", title: "Cloud", credits: 4, term: "202510", grade: "A" }];
    render(<RequirementTree status={evaluateTree(tree, completed, [])} />);
    expect(screen.getByText("4 of 8 credits")).toBeDefined();
    expect(screen.getByText("Any CS 5000–7999")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run __tests__/components/RequirementTree.test.tsx`
Expected: FAIL — `Cannot find module '@/components/RequirementTree'`.

- [ ] **Step 3: Implement RequirementTree**

Create `src/components/RequirementTree.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CheckCircle, Circle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { NodeStatus } from "@/lib/requirements-engine";

function StateIcon({ state }: { state: NodeStatus["state"] }) {
  if (state === "complete") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (state === "planned") return <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  if (state === "partial") return <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />;
}

function progressText(s: NodeStatus): string {
  return s.unit === "credits" ? `${s.earned} of ${s.required} credits` : `${s.earned} of ${s.required}`;
}

function LeafRow({ status }: { status: NodeStatus }) {
  const node = status.node;
  const heading =
    node.type === "course" ? (
      <>
        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
          {node.subject} {node.number}
        </span>
        <span className="truncate text-slate-700 dark:text-slate-200">{node.title}</span>
        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{node.credits} cr</span>
      </>
    ) : node.type === "range" ? (
      <span className="text-slate-700 dark:text-slate-200">
        {node.label ?? `Any ${node.subject} ${node.minNumber}–${node.maxNumber}`}
      </span>
    ) : null;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 p-3 rounded-lg border text-sm",
        status.state === "complete" && "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
        status.state === "planned" && "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30",
        status.state === "missing" && "bg-slate-50 dark:bg-[#1e2537] border-slate-100 dark:border-[#243049]"
      )}
    >
      <StateIcon state={status.state} />
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">{heading}</div>
      {status.matches.length > 0 && (
        <span className="text-xs text-slate-400 flex-shrink-0">
          {status.matches.map((m) => `${m.subject} ${m.courseNumber}`).join(", ")}
        </span>
      )}
    </div>
  );
}

function GroupSection({ status, depth }: { status: NodeStatus; depth: number }) {
  const [open, setOpen] = useState(true);
  const node = status.node;
  if (node.type === "course" || node.type === "range") return <LeafRow status={status} />;

  return (
    <div className={clsx(depth > 0 && "ml-4 border-l-2 border-slate-100 dark:border-[#243049] pl-3")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 text-left"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <StateIcon state={status.state} />
        <span className="font-medium text-slate-800 dark:text-slate-100">{node.label}</span>
        <span
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full border ml-auto flex-shrink-0",
            status.state === "complete"
              ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1e2537] border-slate-200 dark:border-[#243049]"
          )}
        >
          {progressText(status)}
        </span>
      </button>
      {open && (
        <div className="space-y-2">
          {status.children.map((child, i) => (
            <GroupSection key={i} status={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Recursive, collapsible rendering of an evaluated requirement tree. */
export function RequirementTree({ status }: { status: NodeStatus }) {
  return <GroupSection status={status} depth={0} />;
}
```

- [ ] **Step 4: Run to verify component tests pass**

Run: `npx vitest run __tests__/components/RequirementTree.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Integrate into RequirementChecker**

In `src/components/RequirementChecker.tsx` apply these exact edits:

1. Replace imports (lines 5–6):

```ts
import { PROGRAMS, PROGRAM_IDS, LEGACY_PROGRAM_IDS, isProgramId, type ProgramId } from "@/data/programs";
import { analyzeGraduation } from "@/lib/requirements-engine";
import { RequirementTree } from "@/components/RequirementTree";
```

2. Replace the `PersistedPlanner` interface (lines 15–19):

```ts
interface PersistedPlanner {
  program: string; // ProgramId, but legacy uppercase ids may exist in storage
  completed: CompletedCourse[];
  planned: PlannedCourse[];
  milestoneChecks?: Record<string, Record<string, boolean>>; // programId -> milestoneId -> done
  nupathChecks?: Record<string, Record<string, boolean>>;    // programId -> itemId -> done
}
```

3. Delete the `CATEGORY_COLORS` block (lines 42–50) — no longer used.

4. Replace the program state line (`const [program, setProgram] = useState<ProgramId>("MSCS");`):

```ts
  const [program, setProgram] = useState<ProgramId>("mscs");
  const [milestoneChecks, setMilestoneChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [nupathChecks, setNupathChecks] = useState<Record<string, Record<string, boolean>>>({});
```

5. In the hydration effect, replace `if (saved.program) setProgram(saved.program);` with:

```ts
      if (saved.program) {
        const migrated = LEGACY_PROGRAM_IDS[saved.program] ?? saved.program;
        if (isProgramId(migrated)) setProgram(migrated);
      }
      if (saved.milestoneChecks) setMilestoneChecks(saved.milestoneChecks);
      if (saved.nupathChecks) setNupathChecks(saved.nupathChecks);
```

6. In the persist effect, replace the payload line and dependency array:

```ts
      const payload: PersistedPlanner = { program, completed, planned, milestoneChecks, nupathChecks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
```

```ts
  }, [program, completed, planned, milestoneChecks, nupathChecks]);
```

7. `handleImport` keeps working — `result.program` is now a lowercase `ProgramId` (Task 6).

8. Replace the analysis lines:

```ts
  const analysis = analyzeGraduation(PROGRAMS[program], completed, planned);
  const prog = PROGRAMS[program];
```

9. In the program selector, replace `(Object.keys(PROGRAMS) as ProgramId[])` with `PROGRAM_IDS` (same JSX otherwise):

```ts
        {PROGRAM_IDS.map((pid) => (
```

10. Replace the whole "Requirements list" inner block — everything between `<h3 ...>Program Requirements</h3>` and the closing `</div>` of that card — with:

```tsx
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Program Requirements</h3>
        <RequirementTree status={analysis.root} />
```

(Delete the old `analysis.requirementStatuses.map(...)` block entirely.)

11. Replace the "Missing requirements" card's list body:

```tsx
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {analysis.missing.map((m) => (
              <li key={m.label} className="flex items-center gap-2">
                <span className="font-semibold">{m.label}</span>
                <span className="text-amber-500 text-xs">{m.detail}</span>
              </li>
            ))}
          </ul>
```

And change its guard from `analysis.missingRequirements.length > 0` to `analysis.missing.length > 0`.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS — everything except `__tests__/lib/requirements.test.ts` (old engine tests still reference `@/lib/requirements`, which still exists until Task 9 — they should still pass here).

- [ ] **Step 7: Commit**

```bash
git add src/components/RequirementTree.tsx src/components/RequirementChecker.tsx __tests__/components/RequirementTree.test.tsx
git commit -m "feat: render nested requirement trees; persist planner with v2 ids + checklists"
```

---

### Task 8: MilestoneChecklist component + wiring

**Files:**
- Create: `src/components/MilestoneChecklist.tsx`
- Modify: `src/components/RequirementChecker.tsx` (insert after the Requirements card)
- Test: `__tests__/components/MilestoneChecklist.test.tsx`

**Interfaces:**
- Consumes: `Milestone`, `ChecklistItem` from `@/lib/program-schema`.
- Produces: `<MilestoneChecklist title items checks onToggle />` where `items: { id: string; label: string; description?: string }[]`, `checks: Record<string, boolean>`, `onToggle(id: string): void`. Controlled component; persistence stays in RequirementChecker.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/MilestoneChecklist.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MilestoneChecklist } from "@/components/MilestoneChecklist";

const ITEMS = [
  { id: "qual", label: "Qualifying exam", description: "Pass the area qualifier" },
  { id: "proposal", label: "Thesis proposal" },
];

describe("MilestoneChecklist", () => {
  it("renders title, items, and progress", () => {
    render(
      <MilestoneChecklist title="PhD Milestones" items={ITEMS} checks={{ qual: true }} onToggle={() => {}} />
    );
    expect(screen.getByText("PhD Milestones")).toBeDefined();
    expect(screen.getByText("Qualifying exam")).toBeDefined();
    expect(screen.getByText("Pass the area qualifier")).toBeDefined();
    expect(screen.getByText("1 of 2")).toBeDefined();
  });

  it("checkbox state reflects checks and fires onToggle with the item id", () => {
    const onToggle = vi.fn();
    render(<MilestoneChecklist title="PhD Milestones" items={ITEMS} checks={{ qual: true }} onToggle={onToggle} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
    fireEvent.click(boxes[1]);
    expect(onToggle).toHaveBeenCalledWith("proposal");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run __tests__/components/MilestoneChecklist.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/MilestoneChecklist.tsx`:

```tsx
"use client";

import { ListChecks } from "lucide-react";

interface Item {
  id: string;
  label: string;
  description?: string;
}

interface MilestoneChecklistProps {
  title: string;
  items: Item[];
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}

/**
 * Manual checklist for things the engine cannot verify: PhD milestones
 * (qualifier, proposal, ...) and UG NUpath areas. Controlled — the parent
 * owns the checked state and persistence.
 */
export function MilestoneChecklist({ title, items, checks, onToggle }: MilestoneChecklistProps) {
  const doneCount = items.filter((i) => checks[i.id]).length;
  return (
    <div className="bg-white dark:bg-[#161c2d] border border-slate-200 dark:border-[#243049] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-red-600" /> {title}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {doneCount} of {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`msc-${item.id}`}
              checked={!!checks[item.id]}
              onChange={() => onToggle(item.id)}
              className="mt-1 h-4 w-4 accent-red-600"
            />
            <label htmlFor={`msc-${item.id}`} className="text-sm cursor-pointer">
              <span className="text-slate-800 dark:text-slate-100">{item.label}</span>
              {item.description && (
                <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Wire into RequirementChecker**

In `src/components/RequirementChecker.tsx`:

1. Add import:

```ts
import { MilestoneChecklist } from "@/components/MilestoneChecklist";
```

2. Insert directly after the closing `</div>` of the "Requirements list" card (before the "Add completed courses" card):

```tsx
      {prog.milestones && prog.milestones.length > 0 && (
        <MilestoneChecklist
          title="Milestones"
          items={prog.milestones}
          checks={milestoneChecks[program] ?? {}}
          onToggle={(id) =>
            setMilestoneChecks({
              ...milestoneChecks,
              [program]: { ...(milestoneChecks[program] ?? {}), [id]: !(milestoneChecks[program]?.[id]) },
            })
          }
        />
      )}
      {prog.infoChecklist && prog.infoChecklist.length > 0 && (
        <MilestoneChecklist
          title="NUpath (verify with your advisor)"
          items={prog.infoChecklist}
          checks={nupathChecks[program] ?? {}}
          onToggle={(id) =>
            setNupathChecks({
              ...nupathChecks,
              [program]: { ...(nupathChecks[program] ?? {}), [id]: !(nupathChecks[program]?.[id]) },
            })
          }
        />
      )}
```

(The 3 MS programs have neither field, so nothing renders until Phase 2 data arrives — that's expected.)

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/MilestoneChecklist.tsx src/components/RequirementChecker.tsx __tests__/components/MilestoneChecklist.test.tsx
git commit -m "feat: add manual milestone/NUpath checklist component"
```

---

### Task 9: Delete the legacy engine + type cleanup

**Files:**
- Delete: `src/lib/requirements.ts`
- Delete: `__tests__/lib/requirements.test.ts`
- Modify: `src/lib/types.ts:83-141` (remove legacy requirement types)

- [ ] **Step 1: Verify nothing imports the legacy module**

Run: `grep -rn "lib/requirements\"" src/ __tests__/ --include='*.ts' --include='*.tsx'`
Expected: matches only in `src/lib/requirements.ts` itself and `__tests__/lib/requirements.test.ts`. If anything else matches, fix that import first (it should have been rewired in Tasks 5–7).

- [ ] **Step 2: Delete the files**

```bash
git rm src/lib/requirements.ts __tests__/lib/requirements.test.ts
```

- [ ] **Step 3: Remove legacy types**

In `src/lib/types.ts`, delete the "Graduation / Requirements" section types that are now unused: `RequirementCategory`, `RequirementCourse`, `RequirementStatus`, `GraduationAnalysis` (lines 83–105 and 124–141). **Keep** `CompletedCourse` and `PlannedCourse` — the engine and UI still use them.

- [ ] **Step 4: Full suite + typecheck via build**

Run: `npx vitest run`
Expected: PASS (no test references legacy types).

Run: `npm run build`
Expected: `✓ Compiled successfully` — TypeScript catches any straggler imports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy flat requirements engine and types"
```

---

### Task 10: Rebrand to Khoury Grad Planner

**Files:**
- Modify: `src/app/layout.tsx` (metadata + nav brand)
- Modify: `src/app/page.tsx` (landing h1 + copy)
- Modify: `package.json:2`
- Modify: `CLAUDE.md` (title, description, engine section)

- [ ] **Step 1: layout.tsx**

Replace the metadata block:

```ts
export const metadata: Metadata = {
  title: "Khoury Grad Planner",
  description: "Khoury College course browser and graduation planner (undergrad, master's, PhD)",
};
```

In the nav `<Link href="/">`, replace the brand text `NEU Grad Planner` with:

```tsx
                Khoury Grad Planner
```

- [ ] **Step 2: page.tsx**

Replace the `<h1>` contents:

```tsx
          <span className="text-red-600 dark:text-red-400">Khoury</span> Grad Planner
```

Replace the subtitle paragraph text:

```tsx
          Browse Khoury College courses, check campus availability and summer
          sessions, and track graduation requirements for undergrad, master&apos;s,
          and PhD programs.
```

In the Graduation Planner card, replace the `{["MS CS", "MS AI", "MS DS"].map(...)}` badge list with:

```tsx
            {["Undergrad", "Master's", "PhD"].map((p) => (
```

(The surrounding `<span>` JSX stays the same.)

- [ ] **Step 3: package.json**

Change line 2: `"name": "neu-grad-planner",` → `"name": "khoury-grad-planner",`

- [ ] **Step 4: CLAUDE.md**

- Change the H1 `# NEU CS Tracker` → `# Khoury Grad Planner`.
- Change the description line under it to: `Course browser and graduation planner for Khoury College students (undergrad, master's, PhD).`
- Replace the `## Graduation Requirements Engine` section body with:

```markdown
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
```

- In the Architecture tree, update the `lib/requirements.ts` line to the new files (`program-schema.ts`, `requirements-engine.ts`, `data/programs/`).

- [ ] **Step 5: Full verification**

Run: `npx vitest run`
Expected: PASS.
Run: `npm run build`
Expected: `✓ Compiled successfully`, routes unchanged (`/`, `/courses`, `/requirements`).

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx package.json CLAUDE.md
git commit -m "feat: rebrand to Khoury Grad Planner"
```

---

## Self-Review Notes

- **Spec coverage:** schema v2 (Task 1), engine v2 with allocation + level pacing (Tasks 2–3), JSON data + registry + legacy ID mapping (Task 4), catalog rewire (Task 5), transcript IDs (Task 6), nested UI (Task 7), milestone/NUpath checklist (Task 8), legacy deletion (Task 9), rebrand (Task 10). Phase 2 (research pass, 9 more programs, ProgramPicker) is intentionally a separate plan per the spec's delivery section.
- **Known simplification:** allocation is greedy document-order, not optimal matching. For real catalogs (distinct courses per group) this is correct; a pathological overlap (same course in two chooseN groups) resolves first-come. Documented in engine header.
- **collectMissing wiring:** Task 3 Step 3 includes an explicit correction note — final code has exactly one `collectMissing(root, missing, false)` call.
- **Type consistency check:** `NodeStatus.matches: CourseMatch[]` (includes `term`), used by RequirementTree; `AnalysisV2.missing: MissingItem[]` used by RequirementChecker; registry exports used in Tasks 5–8 match Task 4's definitions.
