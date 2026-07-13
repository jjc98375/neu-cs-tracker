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

describe("evaluateTree — nested groups under chooseCredits", () => {
  it("Test A: range sibling of allOf child does not over-claim when allOf already consumed credits", () => {
    // chooseCredits(8) contains: allOf([course CS 5010 (4cr)]) + range CS 5000-7999
    // completed = [CS 5010, CS 6620, CS 6650]
    // Pass 1: CS 5010 consumed by the allOf's course child (4cr toward budget).
    // Budget entering pass 2: 8 - 4 = 4cr remaining.
    // The range should claim exactly ONE course (4cr), not two.
    const root: RequirementNode = {
      type: "chooseCredits", label: "Group", credits: 8,
      children: [
        { type: "allOf", label: "Seq", children: [course("CS", "5010")] },
        { type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 },
      ],
    };
    const s = evaluateTree(root, [done("CS", "5010"), done("CS", "6620"), done("CS", "6650")], []);
    expect(s.earned).toBe(8);
    // The range child should have matched exactly 1 course (4cr), not 2
    const rangeChild = s.children[1];
    expect(rangeChild.matches.length).toBe(1);
  });

  it("Test B: budget threads through nested chooseN so sibling range gets nothing once budget exhausted", () => {
    // chooseCredits(4) contains: chooseN(1, [range CS 7000-7999]) + range CS 5000-6999
    // completed = [CS 7150 (4cr), CS 6620 (4cr)]
    // Pass 1: nothing (no exact course leaves).
    // Budget entering pass 2: 4cr.
    // The nested range under chooseN claims CS 7150 (4cr) → budget now 0.
    // The sibling range should claim NOTHING (budget exhausted).
    const root: RequirementNode = {
      type: "chooseCredits", label: "Group", credits: 4,
      children: [
        { type: "chooseN", label: "Advanced", n: 1,
          children: [{ type: "range", subject: "CS", minNumber: 7000, maxNumber: 7999, creditsPer: 4 }] },
        { type: "range", subject: "CS", minNumber: 5000, maxNumber: 6999, creditsPer: 4 },
      ],
    };
    const s = evaluateTree(root, [done("CS", "7150"), done("CS", "6620")], []);
    expect(s.earned).toBe(4);
    // Sibling range (second child) should have 0 matches
    const siblingRange = s.children[1];
    expect(siblingRange.matches.length).toBe(0);
  });
});

describe("evaluateTree — nested groups under chooseCredits (review findings)", () => {
  it("subtracts course credits claimed inside nested groups from the budget", () => {
    const root: RequirementNode = {
      type: "chooseCredits", label: "Depth", credits: 8,
      children: [
        { type: "allOf", label: "Pair", children: [course("CS", "6140")] },
        { type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 },
      ],
    };
    // CS 6140 (4cr) is claimed in pass 1 inside the nested allOf; the budget
    // must start at 8-4=4, so the range claims exactly one more course.
    const s = evaluateTree(root, [done("CS", "6140"), done("CS", "6620"), done("CS", "6650")], []);
    expect(s.earned).toBe(8);
    expect(s.state).toBe("complete");
    expect(s.children[1].matches.length).toBe(1);
  });

  it("a range inside a nested allOf under chooseCredits shares the credit budget", () => {
    const root: RequirementNode = {
      type: "chooseCredits", label: "Electives", credits: 8,
      children: [
        { type: "allOf", label: "Wrapper", children: [
          { type: "range", subject: "CS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 },
        ]},
        { type: "range", subject: "DS", minNumber: 5000, maxNumber: 7999, creditsPer: 4 },
      ],
    };
    // Nested range claims one CS course (direct parent allOf → single claim,
    // budget 8→4); the sibling DS range then claims one DS course (budget 4→0).
    const s = evaluateTree(root, [done("CS", "6620"), done("CS", "6650"), done("DS", "5230")], []);
    expect(s.earned).toBe(8);
    expect(s.state).toBe("complete");
  });
});

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

  it("summer term types are strictly ordered (40 < 50 < 60)", () => {
    // Full Summer (…50) outranks Summer 1 (…40) as the later term.
    const a = analyzeGraduation(
      MINI_MS,
      [done("CS", "5800"), { ...done("CS", "6140"), term: "202640" }],
      [{ ...plan("CS", "7150"), term: "202650" }]
    );
    expect(a.expectedGraduationTerm).toBe("Summer 2026");
  });
});
