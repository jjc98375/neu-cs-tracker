import { describe, it, expect } from "vitest";
import {
  analyzeGraduation,
  MSCS_REQUIREMENTS,
  MSAI_REQUIREMENTS,
  MSDS_REQUIREMENTS,
  PROGRAMS,
} from "@/lib/requirements";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function completedCourse(
  subject: string,
  courseNumber: string,
  credits = 4,
  term = "202410"
): CompletedCourse {
  return { subject, courseNumber, title: `${subject} ${courseNumber}`, credits, term, grade: "A" };
}

function plannedCourse(
  subject: string,
  courseNumber: string,
  credits = 4,
  term = "202430"
): PlannedCourse {
  return { subject, courseNumber, title: `${subject} ${courseNumber}`, credits, term };
}

// ──────────────────────────────────────────────────────────────────────────────
// PROGRAMS registry
// ──────────────────────────────────────────────────────────────────────────────

describe("PROGRAMS registry", () => {
  it("contains MSCS, MSAI, MSDS", () => {
    expect(PROGRAMS).toHaveProperty("MSCS");
    expect(PROGRAMS).toHaveProperty("MSAI");
    expect(PROGRAMS).toHaveProperty("MSDS");
  });

  it("all programs require 32 credits", () => {
    for (const prog of Object.values(PROGRAMS)) {
      expect(prog.totalCredits).toBe(32);
    }
  });

  it("program names have no campus suffix", () => {
    for (const prog of Object.values(PROGRAMS)) {
      expect(prog.name).not.toMatch(/Seattle|Boston/);
    }
  });

  it("MSCS has 27 requirement courses (2 core + 10 AI/DS + 11 Sys/SW + 4 Theory/Sec)", () => {
    expect(MSCS_REQUIREMENTS).toHaveLength(27);
  });

  it("MSAI has 17 requirement courses (2 required + 2 core-math + 2 core-ml + 11 spec)", () => {
    expect(MSAI_REQUIREMENTS).toHaveLength(17);
  });

  it("MSDS has 25 requirement courses (2 required + 2 core-algo + 2 core-ml + 19 CS conc)", () => {
    expect(MSDS_REQUIREMENTS).toHaveLength(25);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — empty state
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — empty inputs", () => {
  it("returns 32 remaining credits for MSCS with no courses", () => {
    const result = analyzeGraduation("MSCS", [], []);
    expect(result.totalCreditsRequired).toBe(32);
    expect(result.totalCreditsCompleted).toBe(0);
    expect(result.totalCreditsPlanned).toBe(0);
    expect(result.totalCreditsRemaining).toBe(32);
  });

  it("marks all requirements as missing for MSCS with no courses", () => {
    const result = analyzeGraduation("MSCS", [], []);
    const allMissing = result.requirementStatuses.every((s) => s.status === "missing");
    expect(allMissing).toBe(true);
  });

  it("is not on track with no courses", () => {
    expect(analyzeGraduation("MSCS", [], []).onTrack).toBe(false);
  });

  it("expectedGraduationTerm is null with no courses", () => {
    expect(analyzeGraduation("MSCS", [], []).expectedGraduationTerm).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — credit calculations
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — credit calculations", () => {
  it("tracks completed credits correctly", () => {
    const completed = [
      completedCourse("CS", "5010", 4),
      completedCourse("CS", "5800", 4),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.totalCreditsCompleted).toBe(8);
    expect(result.totalCreditsRemaining).toBe(24);
  });

  it("tracks planned credits correctly", () => {
    const planned = [
      plannedCourse("CS", "5600", 4),
      plannedCourse("CS", "5500", 4),
    ];
    const result = analyzeGraduation("MSCS", [], planned);
    expect(result.totalCreditsPlanned).toBe(8);
    expect(result.totalCreditsRemaining).toBe(24);
  });

  it("combines completed and planned credits", () => {
    const completed = [completedCourse("CS", "5010", 4)];
    const planned = [plannedCourse("CS", "5800", 4)];
    const result = analyzeGraduation("MSCS", completed, planned);
    expect(result.totalCreditsCompleted).toBe(4);
    expect(result.totalCreditsPlanned).toBe(4);
    expect(result.totalCreditsRemaining).toBe(24);
  });

  it("remaining never goes below 0", () => {
    const completed = Array.from({ length: 9 }, (_, i) =>
      completedCourse("CS", `600${i}`, 4)
    );
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.totalCreditsRemaining).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — requirement status matching
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — requirement status matching", () => {
  it("marks a completed required course as 'completed'", () => {
    const completed = [completedCourse("CS", "5800", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    const cs5800 = result.requirementStatuses.find(
      (s) => s.requirement.courseNumber === "5800" && s.requirement.subject === "CS"
    );
    expect(cs5800?.status).toBe("completed");
    expect(cs5800?.completedBy?.grade).toBe("A");
  });

  it("marks a planned course as 'planned'", () => {
    const planned = [plannedCourse("CS", "5800", 4)];
    const result = analyzeGraduation("MSCS", [], planned);
    const cs5800 = result.requirementStatuses.find(
      (s) => s.requirement.courseNumber === "5800" && s.requirement.subject === "CS"
    );
    expect(cs5800?.status).toBe("planned");
  });

  it("prefers completed over planned when both exist", () => {
    const completed = [completedCourse("CS", "5800", 4, "202410")];
    const planned = [plannedCourse("CS", "5800", 4, "202430")];
    const result = analyzeGraduation("MSCS", completed, planned);
    const cs5800 = result.requirementStatuses.find(
      (s) => s.requirement.courseNumber === "5800" && s.requirement.subject === "CS"
    );
    expect(cs5800?.status).toBe("completed");
  });

  it("is case-insensitive for subject matching", () => {
    const completed = [completedCourse("cs", "5800", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    const cs5800 = result.requirementStatuses.find(
      (s) => s.requirement.courseNumber === "5800" && s.requirement.subject === "CS"
    );
    expect(cs5800?.status).toBe("completed");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — MSCS requirements
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSCS requirements", () => {
  it("CS 5010 and CS 5800 are required core courses", () => {
    const required = MSCS_REQUIREMENTS.filter((r) => r.required);
    expect(required).toHaveLength(2);
    expect(required.map((r) => r.courseNumber).sort()).toEqual(["5010", "5800"]);
  });

  it("reports missing breadth groups when none satisfied", () => {
    const result = analyzeGraduation("MSCS", [], []);
    const missingGroups = result.missingRequirements.filter((r) => r.groupId);
    expect(missingGroups.length).toBe(3); // ai-ds, sys-sw, theory-sec
  });

  it("satisfies AI & Data Science breadth with CS 6140", () => {
    const completed = [completedCourse("CS", "6140", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("mscs-ai-ds");
  });

  it("satisfies Systems & Software breadth with CS 5600", () => {
    const completed = [completedCourse("CS", "5600", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("mscs-sys-sw");
  });

  it("satisfies Theory & Security breadth with CY 6740", () => {
    const completed = [completedCourse("CY", "6740", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("mscs-theory-sec");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — MSAI requirements
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSAI requirements", () => {
  it("CS 5100 and CS 5130 are required core courses", () => {
    const required = MSAI_REQUIREMENTS.filter((r) => r.required);
    expect(required).toHaveLength(2);
    expect(required.map((r) => r.courseNumber).sort()).toEqual(["5100", "5130"]);
  });

  it("has core math OR group (DADS 5200 or DS 5020)", () => {
    const mathGroup = MSAI_REQUIREMENTS.filter((r) => r.groupId === "msai-core-math");
    expect(mathGroup).toHaveLength(2);
    expect(mathGroup[0].groupMinCount).toBe(1);
  });

  it("has core ML OR group (EECE 5644 or DADS 7275)", () => {
    const mlGroup = MSAI_REQUIREMENTS.filter((r) => r.groupId === "msai-core-ml");
    expect(mlGroup).toHaveLength(2);
    expect(mlGroup[0].groupMinCount).toBe(1);
  });

  it("satisfies core math group with DS 5020", () => {
    const completed = [completedCourse("DS", "5020", 4)];
    const result = analyzeGraduation("MSAI", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("msai-core-math");
  });

  it("specialization group requires 2 courses", () => {
    const specGroup = MSAI_REQUIREMENTS.filter((r) => r.groupId === "msai-spec");
    expect(specGroup.length).toBeGreaterThan(0);
    expect(specGroup[0].groupMinCount).toBe(2);
  });

  it("completing 2 spec courses satisfies the group", () => {
    const completed = [
      completedCourse("CS", "7150", 4),
      completedCourse("CS", "7140", 4),
    ];
    const result = analyzeGraduation("MSAI", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("msai-spec");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — MSDS requirements
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSDS requirements", () => {
  it("DS 5110 and DS 5500 are required", () => {
    const required = MSDS_REQUIREMENTS.filter((r) => r.required);
    expect(required).toHaveLength(2);
    expect(required.map((r) => r.courseNumber).sort()).toEqual(["5110", "5500"]);
  });

  it("has algo OR group (CS 5800 or EECE 7205)", () => {
    const algoGroup = MSDS_REQUIREMENTS.filter((r) => r.groupId === "msds-core-algo");
    expect(algoGroup).toHaveLength(2);
  });

  it("has ML OR group (CS 6140 or EECE 5644)", () => {
    const mlGroup = MSDS_REQUIREMENTS.filter((r) => r.groupId === "msds-core-ml");
    expect(mlGroup).toHaveLength(2);
  });

  it("satisfies algo group with CS 5800", () => {
    const completed = [completedCourse("CS", "5800", 4)];
    const result = analyzeGraduation("MSDS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("msds-core-algo");
  });

  it("satisfies algo group with EECE 7205", () => {
    const completed = [completedCourse("EECE", "7205", 4)];
    const result = analyzeGraduation("MSDS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("msds-core-algo");
  });

  it("CS concentration requires 4 courses", () => {
    const concGroup = MSDS_REQUIREMENTS.filter((r) => r.groupId === "msds-cs-conc");
    expect(concGroup.length).toBe(19);
    expect(concGroup[0].groupMinCount).toBe(4);
  });

  it("completing 4 CS concentration courses satisfies the group", () => {
    const completed = [
      completedCourse("CS", "5100", 4),
      completedCourse("CS", "6120", 4),
      completedCourse("CS", "7150", 4),
      completedCourse("CS", "6220", 4),
    ];
    const result = analyzeGraduation("MSDS", completed, []);
    const missingGroups = result.missingRequirements.map((r) => r.groupId);
    expect(missingGroups).not.toContain("msds-cs-conc");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — onTrack logic
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — onTrack logic", () => {
  it("onTrack is false when credits are insufficient", () => {
    const completed = [completedCourse("CS", "5800", 4)];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.onTrack).toBe(false);
  });

  it("onTrack is false when groups are unsatisfied even with enough credits", () => {
    const completed = Array.from({ length: 8 }, (_, i) =>
      completedCourse("CS", `999${i}`, 4)
    );
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.onTrack).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — expectedGraduationTerm
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — expectedGraduationTerm", () => {
  it("is null with no courses", () => {
    expect(analyzeGraduation("MSCS", [], []).expectedGraduationTerm).toBeNull();
  });

  it("projects future terms when credits remain", () => {
    // 8 credits completed, 24 remaining → ceil(24/8) = 3 semesters
    const completed = [
      completedCourse("CS", "5010", 4, "202430"),
      completedCourse("CS", "5800", 4, "202430"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Spring 2026");
  });

  it("nextTerm: spring → fall", () => {
    const completed = [
      completedCourse("CS", "5010", 4, "202410"),
      completedCourse("CS", "5800", 4, "202410"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    // 24 remaining → 3 semesters from Spring 2024
    expect(result.expectedGraduationTerm).toBe("Fall 2025");
  });

  it("nextTerm: Summer 1 → Summer 2 → Fall", () => {
    const completed = [
      completedCourse("CS", "5010", 4, "202440"),
      completedCourse("CS", "5800", 4, "202440"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    // 202440 → 202460 → 202430 → 202510
    expect(result.expectedGraduationTerm).toBe("Spring 2025");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// termToSortKey (tested indirectly)
// ──────────────────────────────────────────────────────────────────────────────

describe("termToSortKey (via latest-term selection)", () => {
  it("Fall 2024 is treated as later than Spring 2024", () => {
    const completed = [
      completedCourse("CS", "5010", 4, "202430"),
      completedCourse("CS", "5800", 4, "202410"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Spring 2026");
  });
});
