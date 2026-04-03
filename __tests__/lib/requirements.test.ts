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

  it("MSCS has 27 requirement courses (2 core + 10 AI/DS + 11 Sys/SW + 4 Theory/Sec)", () => {
    expect(MSCS_REQUIREMENTS).toHaveLength(27);
  });

  it("MSAI has 19 requirement courses (5 core + 14 specialization)", () => {
    expect(MSAI_REQUIREMENTS).toHaveLength(19);
  });

  it("MSDS has 23 requirement courses (4 core + 19 CS concentration)", () => {
    expect(MSDS_REQUIREMENTS).toHaveLength(23);
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
    expect(cs5800?.plannedBy?.term).toBe("202430");
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
// analyzeGraduation — MSCS requirements (core + breadth groups)
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSCS requirements", () => {
  it("CS 5010 and CS 5800 are required core courses", () => {
    const required = MSCS_REQUIREMENTS.filter((r) => r.required);
    expect(required).toHaveLength(2);
    expect(required.map((r) => r.courseNumber).sort()).toEqual(["5010", "5800"]);
  });

  it("reports missing required courses when none completed", () => {
    const result = analyzeGraduation("MSCS", [], []);
    const missingRequired = result.missingRequirements.filter((r) => r.required);
    expect(missingRequired).toHaveLength(2);
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

  it("completing core + all 3 breadth groups clears required/group missing", () => {
    const completed = [
      completedCourse("CS", "5010", 4),  // required
      completedCourse("CS", "5800", 4),  // required
      completedCourse("CS", "6140", 4),  // AI/DS breadth
      completedCourse("CS", "5600", 4),  // Sys/SW breadth
      completedCourse("CY", "5770", 4),  // Theory/Sec breadth
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.missingRequirements).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — MSAI required courses
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSAI required courses", () => {
  it("has 5 required core courses", () => {
    const required = MSAI_REQUIREMENTS.filter((r) => r.required);
    expect(required).toHaveLength(5);
  });

  it("CS 5100 is required for MSAI", () => {
    const result = analyzeGraduation("MSAI", [], []);
    const missing = result.missingRequirements.find(
      (r) => r.courseNumber === "5100" && r.required
    );
    expect(missing).toBeDefined();
  });

  it("CS 5170 (AI for HCI) is required for MSAI", () => {
    const result = analyzeGraduation("MSAI", [], []);
    const missing = result.missingRequirements.find(
      (r) => r.courseNumber === "5170" && r.required
    );
    expect(missing).toBeDefined();
  });

  it("completing all 5 required courses removes them from missingRequirements", () => {
    const completed = [
      completedCourse("CS", "5100", 4),
      completedCourse("CS", "5010", 4),
      completedCourse("CS", "5800", 4),
      completedCourse("CS", "6140", 4),
      completedCourse("CS", "5170", 4),
    ];
    const result = analyzeGraduation("MSAI", completed, []);
    const missingRequired = result.missingRequirements.filter((r) => r.required);
    expect(missingRequired).toHaveLength(0);
  });

  it("MSAI specialization group requires 3 courses — reports missing if only 1 done", () => {
    const completed = [completedCourse("CS", "6120", 4)];
    const result = analyzeGraduation("MSAI", completed, []);
    const missingSpec = result.missingRequirements.find(
      (r) => r.groupId === "msai-spec"
    );
    expect(missingSpec).toBeDefined();
  });

  it("MSAI specialization group satisfied with 3 elective courses", () => {
    const completed = [
      completedCourse("CS", "6120", 4),
      completedCourse("CS", "7150", 4),
      completedCourse("CS", "5330", 4),
    ];
    const result = analyzeGraduation("MSAI", completed, []);
    const missingSpec = result.missingRequirements.find(
      (r) => r.groupId === "msai-spec"
    );
    expect(missingSpec).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — MSDS required courses
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — MSDS required courses", () => {
  it("has 4 required core courses", () => {
    const requiredCourses = MSDS_REQUIREMENTS.filter((r) => r.required);
    expect(requiredCourses).toHaveLength(4);
  });

  it("DS 5110 is required", () => {
    const result = analyzeGraduation("MSDS", [], []);
    const missing = result.missingRequirements.find(
      (r) => r.subject === "DS" && r.courseNumber === "5110"
    );
    expect(missing).toBeDefined();
  });

  it("DS 5500 (Data Science Capstone) is required", () => {
    const result = analyzeGraduation("MSDS", [], []);
    const missing = result.missingRequirements.find(
      (r) => r.subject === "DS" && r.courseNumber === "5500"
    );
    expect(missing).toBeDefined();
  });

  it("completing all 4 core courses removes them from missingRequirements", () => {
    const completed = [
      completedCourse("DS", "5110", 4),
      completedCourse("CS", "5800", 4),
      completedCourse("CS", "6140", 4),
      completedCourse("DS", "5500", 4),
    ];
    const result = analyzeGraduation("MSDS", completed, []);
    const missingRequired = result.missingRequirements.filter((r) => r.required);
    expect(missingRequired).toHaveLength(0);
  });

  it("MSDS CS concentration requires 4 courses", () => {
    const result = analyzeGraduation("MSDS", [], []);
    const missingConc = result.missingRequirements.find(
      (r) => r.groupId === "msds-cs-conc"
    );
    expect(missingConc).toBeDefined();
  });

  it("completing 4 CS concentration courses satisfies the group", () => {
    const completed = [
      completedCourse("CS", "5100", 4),
      completedCourse("CS", "6120", 4),
      completedCourse("CS", "7150", 4),
      completedCourse("CS", "6220", 4),
    ];
    const result = analyzeGraduation("MSDS", completed, []);
    const missingConc = result.missingRequirements.find(
      (r) => r.groupId === "msds-cs-conc"
    );
    expect(missingConc).toBeUndefined();
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

  it("onTrack is true when MSAI fully satisfied", () => {
    // 5 required + 3 specialization = 8 courses = 32 credits
    const completed = [
      completedCourse("CS", "5100", 4),
      completedCourse("CS", "5010", 4),
      completedCourse("CS", "5800", 4),
      completedCourse("CS", "6140", 4),
      completedCourse("CS", "5170", 4),
      completedCourse("CS", "6120", 4),
      completedCourse("CS", "7150", 4),
      completedCourse("CS", "5330", 4),
    ];
    const result = analyzeGraduation("MSAI", completed, []);
    expect(result.onTrack).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// analyzeGraduation — expectedGraduationTerm
// ──────────────────────────────────────────────────────────────────────────────

describe("analyzeGraduation — expectedGraduationTerm", () => {
  it("is null with no courses", () => {
    expect(analyzeGraduation("MSCS", [], []).expectedGraduationTerm).toBeNull();
  });

  it("returns last term description when remaining == 0", () => {
    // 8 courses = 32 credits
    const completed = [
      completedCourse("CS", "5100", 4, "202430"),
      completedCourse("CS", "5010", 4, "202430"),
      completedCourse("CS", "5800", 4, "202430"),
      completedCourse("CS", "6140", 4, "202430"),
      completedCourse("CS", "5170", 4, "202430"),
      completedCourse("CS", "6120", 4, "202430"),
      completedCourse("CS", "7150", 4, "202430"),
      completedCourse("CS", "5330", 4, "202430"),
    ];
    const result = analyzeGraduation("MSAI", completed, []);
    expect(result.totalCreditsRemaining).toBe(0);
    expect(result.expectedGraduationTerm).toBe("Fall 2024");
  });

  it("projects future terms when credits remain", () => {
    // 8 credits completed, need 24 more → ceil(24/8) = 3 semesters
    // From Fall 2024: → Spring 2025 → Fall 2025 → Spring 2026
    const completed = [
      completedCourse("CS", "5010", 4, "202430"),
      completedCourse("CS", "5800", 4, "202430"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Spring 2026");
  });

  it("uses latest term from mix of completed and planned", () => {
    const completed = [completedCourse("CS", "5010", 4, "202410")];
    const planned = [plannedCourse("CS", "5800", 4, "202430")];
    const result = analyzeGraduation("MSCS", completed, planned);
    expect(result.expectedGraduationTerm).not.toBeNull();
  });

  it("nextTerm: spring → fall (suffix 10 → 30)", () => {
    // From Spring 2024, 24 remaining → 3 semesters
    // 202410 → 202430 → 202510 → 202530
    const completed = [
      completedCourse("CS", "5010", 4, "202410"),
      completedCourse("CS", "5800", 4, "202410"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Fall 2025");
  });

  it("nextTerm: fall → next spring (suffix 30 → next year 10)", () => {
    // From Fall 2024, 24 remaining → 3 semesters
    // 202430 → 202510 → 202530 → 202610
    const completed = [
      completedCourse("CS", "5010", 4, "202430"),
      completedCourse("CS", "5800", 4, "202430"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Spring 2026");
  });

  it("nextTerm: Summer 1 → Summer 2 (suffix 40 → 60)", () => {
    // From Summer 1 2024, 24 remaining → 3 semesters
    // 202440 → 202460 → 202430 → 202510
    const completed = [
      completedCourse("CS", "5010", 4, "202440"),
      completedCourse("CS", "5800", 4, "202440"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Spring 2025");
  });

  it("nextTerm: Summer 2 → Fall (suffix 60 → 30)", () => {
    // From Summer 2 2024, 24 remaining → 3 semesters
    // 202460 → 202430 → 202510 → 202530
    const completed = [
      completedCourse("CS", "5010", 4, "202460"),
      completedCourse("CS", "5800", 4, "202460"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).toBe("Fall 2025");
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

  it("Summer 40 and 50 sort at same level as Summer", () => {
    const completed = [
      completedCourse("CS", "5010", 4, "202450"),
      completedCourse("CS", "5800", 4, "202440"),
    ];
    const result = analyzeGraduation("MSCS", completed, []);
    expect(result.expectedGraduationTerm).not.toBeNull();
  });
});
