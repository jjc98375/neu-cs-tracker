import { describe, it, expect } from "vitest";
import { PROGRAMS, PROGRAM_IDS, LEGACY_PROGRAM_IDS, isProgramId } from "@/data/programs";
import { validateProgram, type RequirementNode } from "@/lib/program-schema";

function collectCourses(node: RequirementNode, out: Set<string>): void {
  if (node.type === "course") { out.add(`${node.subject} ${node.number}`); return; }
  if (node.type === "range") return;
  for (const c of node.children) collectCourses(c, out);
}

describe("programs registry", () => {
  it("contains the 12 Khoury programs", () => {
    expect([...PROGRAM_IDS]).toEqual([
      "bscs", "bacs", "bs-cy", "bs-ds",
      "mscs", "mscs-align", "msai", "msds", "ms-cy",
      "phd-cs", "phd-cy", "phd-phi",
    ]);
    expect(Object.keys(PROGRAMS).sort()).toEqual([...PROGRAM_IDS].sort());
  });

  it("every program passes schema validation", () => {
    for (const id of PROGRAM_IDS) {
      expect(validateProgram(PROGRAMS[id]), `program ${id}`).toEqual([]);
    }
  });

  it("ids, levels, credits, and provenance are consistent", () => {
    const levels: Record<string, string> = {
      bscs: "UG", bacs: "UG", "bs-cy": "UG", "bs-ds": "UG",
      mscs: "MS", "mscs-align": "MS", msai: "MS", msds: "MS", "ms-cy": "MS",
      "phd-cs": "PhD", "phd-cy": "PhD", "phd-phi": "PhD",
    };
    for (const id of PROGRAM_IDS) {
      expect(PROGRAMS[id].id).toBe(id);
      expect(PROGRAMS[id].level, `level of ${id}`).toBe(levels[id]);
      expect(PROGRAMS[id].catalogUrl).toMatch(/^https:\/\/catalog\.northeastern\.edu\//);
    }
    // Spot-check totals against the catalog statements.
    expect(PROGRAMS.bscs.totalCredits).toBe(135);
    expect(PROGRAMS.bacs.totalCredits).toBe(134);
    expect(PROGRAMS["bs-cy"].totalCredits).toBe(135);
    expect(PROGRAMS["bs-ds"].totalCredits).toBe(133);
    expect(PROGRAMS.mscs.totalCredits).toBe(32);
    expect(PROGRAMS["mscs-align"].totalCredits).toBe(44);
    expect(PROGRAMS["ms-cy"].totalCredits).toBe(32);
    expect(PROGRAMS["phd-cs"].totalCredits).toBe(48);
    expect(PROGRAMS["phd-cy"].totalCredits).toBe(48);
    expect(PROGRAMS["phd-phi"].totalCredits).toBe(48);
  });

  it("UG programs carry a NUpath checklist; PhD programs carry milestones", () => {
    for (const id of PROGRAM_IDS) {
      const p = PROGRAMS[id];
      if (p.level === "UG") {
        expect(p.infoChecklist?.length, `infoChecklist of ${id}`).toBeGreaterThan(0);
        expect(p.milestones).toBeUndefined();
      }
      if (p.level === "PhD") {
        expect(p.milestones?.length, `milestones of ${id}`).toBeGreaterThan(0);
        expect(p.infoChecklist).toBeUndefined();
      }
    }
  });

  it("mscs matches the 2025-2026 catalog (core + breadth + electives)", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.mscs.requirements, courses);
    expect(courses.has("CS 5010")).toBe(true);
    expect(courses.has("CS 5011")).toBe(true); // recitation added in 2025-2026
    expect(courses.has("CS 5800")).toBe(true);
    expect(courses.has("CS 6140")).toBe(true); // AI/DS breadth
    expect(courses.has("CS 5600")).toBe(true); // Systems breadth
    expect(courses.has("CY 6740")).toBe(true); // Theory/Security breadth
    expect(courses.has("CS 7990")).toBe(true); // electives section
    expect(courses.size).toBe(39);
  });

  it("msai matches the 2025-2026 catalog (core + 5 concentrations)", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.msai.requirements, courses);
    expect(courses.has("CS 5100")).toBe(true);
    expect(courses.has("CS 5130")).toBe(true);
    expect(courses.has("DADS 5200")).toBe(true);
    expect(courses.has("EECE 5644")).toBe(true);
    expect(courses.has("EECE 7945")).toBe(true); // Computer Vision capstone
    expect(courses.has("CS 6170")).toBe(true);   // Khoury AI Capstone
    expect(courses.size).toBe(53);
  });

  it("msds matches the 2025-2026 catalog (core + 2 concentrations)", () => {
    const courses = new Set<string>();
    collectCourses(PROGRAMS.msds.requirements, courses);
    expect(courses.has("DS 5110")).toBe(true);
    expect(courses.has("DS 5500")).toBe(true);
    expect(courses.has("CS 7250")).toBe(true);  // CS concentration
    expect(courses.has("IE 7615")).toBe(true);  // COE concentration
    expect(courses.size).toBe(69);
  });

  it("legacy uppercase ids map to new ids", () => {
    expect(LEGACY_PROGRAM_IDS).toEqual({ MSCS: "mscs", MSAI: "msai", MSDS: "msds" });
  });

  it("isProgramId narrows correctly", () => {
    expect(isProgramId("mscs")).toBe(true);
    expect(isProgramId("bscs")).toBe(true);
    expect(isProgramId("phd-cs")).toBe(true);
    expect(isProgramId("MSCS")).toBe(false);
    expect(isProgramId("nope")).toBe(false);
  });
});
