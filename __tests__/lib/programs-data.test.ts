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
