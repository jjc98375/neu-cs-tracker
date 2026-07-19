import { describe, it, expect } from "vitest";
import { PROGRAMS } from "@/data/programs";
import { analyzeGraduation, evaluateTree, type NodeStatus } from "@/lib/requirements-engine";
import type { CompletedCourse } from "@/lib/types";

function done(subject: string, courseNumber: string, credits = 4, term = "202430"): CompletedCourse {
  return { subject, courseNumber, title: `${subject} ${courseNumber}`, credits, term };
}

/** Find the first descendant group whose label starts with the prefix. */
function group(status: NodeStatus, labelPrefix: string): NodeStatus | undefined {
  const node = status.node;
  if (node.type !== "course" && node.type !== "range" && node.label.startsWith(labelPrefix))
    return status;
  for (const c of status.children) {
    const hit = group(c, labelPrefix);
    if (hit) return hit;
  }
  return undefined;
}

describe("program fixtures: synthetic students", () => {
  it("bscs: fundamentals + one concentration complete; security missing", () => {
    const completed = [
      done("CS", "1800"), done("CS", "1802", 1),
      done("CS", "2000"), done("CS", "2001", 1),
      done("CS", "2100"), done("CS", "2101", 1),
      // AI concentration: both required + two electives
      done("CS", "4100"), done("DS", "4400"),
      done("CS", "4120"), done("DS", "4440"),
    ];
    const root = evaluateTree(PROGRAMS.bscs.requirements, completed, []);
    expect(group(root, "Computer Science Fundamental Courses")?.state).toBe("complete");
    const conc = group(root, "Concentration (pick one");
    expect(conc?.state).toBe("complete");
    expect(group(conc!, "Concentration in Artificial Intelligence")?.state).toBe("complete");
    expect(group(root, "Security Required Course")?.state).toBe("missing");
  });

  it("bscs: science requirement counts a lab pair as one of two courses", () => {
    const completed = [
      done("BIOL", "1111"), done("BIOL", "1112", 1),
    ];
    const root = evaluateTree(PROGRAMS.bscs.requirements, completed, []);
    const sci = group(root, "Science Requirement");
    expect(sci?.state).toBe("partial");
    expect(sci?.earned).toBe(1);
    expect(sci?.required).toBe(2);
  });

  it("bscs: Khoury electives budget fills from ranges without double-counting required courses", () => {
    const completed = [
      done("CS", "3000"), // claimed by exact leaf, not the CS range
      done("CS", "2510"), done("CY", "2990"),
    ];
    const root = evaluateTree(PROGRAMS.bscs.requirements, completed, []);
    const khoury = group(root, "Khoury Approved Electives");
    expect(khoury?.state).toBe("complete"); // 4 + 4 credits from the two range hits
    expect(group(root, "Computer Science Required Courses")?.state).toBe("partial");
  });

  it("bacs: single science course satisfies the BA science requirement", () => {
    const completed = [done("MATH", "2331")];
    const root = evaluateTree(PROGRAMS.bacs.requirements, completed, []);
    expect(group(root, "Science Course")?.state).toBe("complete");
  });

  it("bs-cy: electives option is an alternative to the cyber operations concentration", () => {
    const completed = [
      done("CY", "4170"),
      done("CS", "2800"), done("CS", "4400"), done("DS", "4300"), done("MATH", "3527"),
    ];
    const root = evaluateTree(PROGRAMS["bs-cy"].requirements, completed, []);
    const choice = group(root, "Concentration or Electives Option");
    expect(choice?.state).toBe("complete");
    expect(group(choice!, "Electives Option")?.state).toBe("complete");
  });

  it("bs-ds: either programming pathway satisfies the chooseN", () => {
    const dsPath = [done("DS", "2500"), done("DS", "2501", 1), done("DS", "3500")];
    const root = evaluateTree(PROGRAMS["bs-ds"].requirements, dsPath, []);
    const pathways = group(root, "Programming Sequence Pathways");
    expect(pathways?.state).toBe("complete");
    expect(group(pathways!, "Data Science Option")?.state).toBe("complete");
    expect(group(pathways!, "Computer Science Option")?.state).toBe("missing");
  });

  it("mscs-align: breadth chooseCredits and range electives fill correctly", () => {
    const completed = [
      done("CS", "5800"),
      done("CS", "5100"), done("CS", "5600"), done("CS", "6140"), // breadth 12
      done("CS", "7150"), done("CY", "6120"), done("DS", "5230"), // electives 12
    ];
    const root = evaluateTree(PROGRAMS["mscs-align"].requirements, completed, []);
    expect(group(root, "Core Requirements")?.state).toBe("complete");
    expect(group(root, "Breadth Areas")?.state).toBe("complete");
    const electives = group(root, "Electives");
    // CS 7150 lands in the CS 5100-7980 range; CY 6120 and DS 5230 on exact leaves.
    expect(electives?.state).toBe("complete");
    expect(electives?.earned).toBe(12);
  });

  it("ms-cy: full synthetic student graduates on the standard path", () => {
    const completed = [
      done("CY", "5001"), done("CY", "5010"),
      done("CY", "5120"), done("CY", "6740"), // technical 8
      done("CY", "5200"), done("CY", "5240"), // contextual 8
      done("CY", "7900"),
      done("CS", "5500"), // elective 4
    ];
    const analysis = analyzeGraduation(PROGRAMS["ms-cy"], completed, []);
    expect(analysis.root.state).toBe("complete");
    expect(analysis.totalCreditsCompleted).toBe(32);
    expect(analysis.onTrack).toBe(true);
    expect(analysis.missing).toEqual([]);
  });

  it("phd-cs: six core courses complete the area requirement; electives fill from ranges", () => {
    const completed = [
      // 2 seminar + 2 nonseminar 7000-level + 2 others
      done("CS", "7170"), done("CS", "7375"),
      done("CS", "7140"), done("CS", "7600"),
      done("CS", "6140"), done("CS", "5800"),
      // electives via ranges (24 credits)
      done("CS", "5200"), done("CS", "5400"), done("CS", "6120"),
      done("CS", "6200"), done("CS", "6220"), done("CS", "6240"),
    ];
    const root = evaluateTree(PROGRAMS["phd-cs"].requirements, completed, []);
    const core = group(root, "Course Areas");
    expect(core?.state).toBe("complete");
    expect(core?.earned).toBeGreaterThanOrEqual(6);
    // Exact core leaves claim first; the 6 elective courses flow to the ranges.
    expect(group(root, "Electives")?.state).toBe("missing");
  });

  it("phd-cs: courses beyond the core flow into the elective ranges", () => {
    const completed = [
      done("CS", "5405"), done("CS", "6115"), done("CS", "6300"),
      done("CS", "6805"), done("CS", "5115"), done("CS", "5215"),
    ];
    const root = evaluateTree(PROGRAMS["phd-cs"].requirements, completed, []);
    const electives = group(root, "Electives");
    expect(electives?.state).toBe("complete");
    expect(electives?.earned).toBe(24);
  });

  it("phd-cy: two courses from one track satisfy the tracks group", () => {
    const completed = [done("CS", "7800"), done("CS", "7805")];
    const root = evaluateTree(PROGRAMS["phd-cy"].requirements, completed, []);
    const tracks = group(root, "Tracks");
    expect(tracks?.state).toBe("complete");
    expect(group(tracks!, "Theory")?.state).toBe("complete");
  });

  it("phd-cy: one course in each of two tracks does NOT satisfy the tracks group", () => {
    const completed = [done("EECE", "7390"), done("CS", "7150")];
    const root = evaluateTree(PROGRAMS["phd-cy"].requirements, completed, []);
    // Each track is partial; chooseN(1) over tracks stays partial.
    expect(group(root, "Tracks")?.state).toBe("partial");
  });

  it("phd-phi: core plus 12 elective credits; PhD has no graduation projection", () => {
    const completed = [
      done("HINF", "5200"), done("CS", "5010"), done("CS", "7340"),
      done("HINF", "5300"), done("CS", "7300"), done("CS", "7200"),
      done("HINF", "5301"), done("HINF", "8982", 1),
      done("HLTH", "5410"), done("PHTH", "5220"), done("CAEP", "6100"),
    ];
    const analysis = analyzeGraduation(PROGRAMS["phd-phi"], completed, []);
    expect(group(analysis.root, "Core Requirements")?.state).toBe("complete");
    expect(group(analysis.root, "Electives")?.state).toBe("complete");
    expect(analysis.expectedGraduationTerm).toBeNull();
  });
});
