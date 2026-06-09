import { describe, it, expect } from "vitest";
import { termToCode, programToId } from "@/lib/transcript-parser";

describe("termToCode", () => {
  it("maps season + year to a Banner term code", () => {
    expect(termToCode("Fall 2024 Semester")).toBe("202430");
    expect(termToCode("Spring 2025 Semester")).toBe("202510");
    expect(termToCode("Summer Full 2025 Semester")).toBe("202550");
    expect(termToCode("Summer 2026 Semester")).toBe("202650");
    expect(termToCode("Summer 1 2025 Semester")).toBe("202550");
  });
  it("returns empty string for unrecognized terms", () => {
    expect(termToCode("Winter 2025")).toBe("");
    expect(termToCode("garbage")).toBe("");
  });
});

describe("programToId", () => {
  it("maps the Primary Program string to a ProgramId", () => {
    expect(programToId("M.S. in Computer Science")).toBe("MSCS");
    expect(programToId("M.S. in Artificial Intelligence")).toBe("MSAI");
    expect(programToId("M.S. in Data Science")).toBe("MSDS");
  });
  it("returns undefined for unrecognized programs", () => {
    expect(programToId("M.S. in Cybersecurity")).toBeUndefined();
    expect(programToId("")).toBeUndefined();
  });
});
