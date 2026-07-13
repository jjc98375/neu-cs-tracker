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
