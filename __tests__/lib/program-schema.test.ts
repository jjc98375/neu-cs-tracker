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

  it("rejects a missing requirements field", () => {
    const { requirements: _drop, ...rest } = VALID;
    const errors = validateProgram(rest);
    expect(errors.some((e) => e.includes("requirements"))).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    const errors = validateProgram({ ...VALID, totalCredits: Infinity });
    expect(errors.some((e) => e.includes("totalCredits"))).toBe(true);
  });
});
