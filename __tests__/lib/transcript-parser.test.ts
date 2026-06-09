import { describe, it, expect } from "vitest";
import { termToCode, programToId } from "@/lib/transcript-parser";
import { parseGradedRow, parseInProgressRow, isEarnedGrade } from "@/lib/transcript-parser";

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

describe("parseGradedRow", () => {
  it("parses a completed course row", () => {
    expect(parseGradedRow("CS 5010 GR Programming Design Paradigm A- 4.000 14.668", "202430"))
      .toEqual({ subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, term: "202430", grade: "A-" });
  });
  it("parses a single-grade-letter row", () => {
    expect(parseGradedRow("CS 5100 GR Fndtns Artificial Intelligence A 4.000 16.000", "202550"))
      .toEqual({ subject: "CS", courseNumber: "5100", title: "Fndtns Artificial Intelligence", credits: 4, term: "202550", grade: "A" });
  });
  it("returns null for a non-course line", () => {
    expect(parseGradedRow("Term Totals Attempt Hours Passed Hours", "202430")).toBeNull();
    expect(parseGradedRow("Academic Standing", "202430")).toBeNull();
  });
});

describe("parseInProgressRow", () => {
  it("parses an in-progress course row (no grade, no quality points)", () => {
    expect(parseInProgressRow("CS 5200 GR Database Management Sys 4.000", "202650"))
      .toEqual({ subject: "CS", courseNumber: "5200", title: "Database Management Sys", credits: 4, term: "202650" });
  });
  it("returns null for a non-course line", () => {
    expect(parseInProgressRow("Subject Course Level Title Credit Hours Start and End Dates", "202650")).toBeNull();
  });
});

describe("isEarnedGrade", () => {
  it("accepts earned grades", () => {
    ["A", "A-", "B+", "C", "S"].forEach((g) => expect(isEarnedGrade(g)).toBe(true));
  });
  it("rejects not-earned grades", () => {
    ["W", "I", "IP", "NF", "U", "L", "X"].forEach((g) => expect(isEarnedGrade(g)).toBe(false));
  });
});
