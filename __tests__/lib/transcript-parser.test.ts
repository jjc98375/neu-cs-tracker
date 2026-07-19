import { describe, it, expect, beforeAll } from "vitest";
import { termToCode, programToId } from "@/lib/transcript-parser";
import { parseGradedRow, parseInProgressRow, isEarnedGrade } from "@/lib/transcript-parser";
import { parseTranscript, type ParsedTranscript } from "@/lib/transcript-parser";

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
    expect(programToId("M.S. in Computer Science")).toBe("mscs");
    expect(programToId("M.S. in Artificial Intelligence")).toBe("msai");
    expect(programToId("M.S. in Data Science")).toBe("msds");
    expect(programToId("M.S. in Cybersecurity")).toBe("ms-cy");
    expect(programToId("B.S. in Computer Science")).toBe("bscs");
    expect(programToId("Bachelor of Arts in Computer Science")).toBe("bacs");
    expect(programToId("B.S. in Cybersecurity")).toBe("bs-cy");
    expect(programToId("B.S. in Data Science")).toBe("bs-ds");
    expect(programToId("Khoury Align M.S. in Computer Science")).toBe("mscs-align");
    expect(programToId("Ph.D. in Computer Science")).toBe("phd-cs");
    expect(programToId("Doctor of Philosophy in Cybersecurity")).toBe("phd-cy");
    expect(programToId("Ph.D. in Personal Health Informatics")).toBe("phd-phi");
  });
  it("returns undefined for unrecognized programs", () => {
    expect(programToId("M.S. in Underwater Basket Weaving")).toBeUndefined();
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

// Exact lines produced by src/lib/pdf-text.ts extractLines() on the real NEU
// Unofficial Academic Transcript PDF. Long titles split across three rows
// (fragment ABOVE, titleless code row, fragment BELOW); the column header wraps
// into three rows; "about:blank N/N" page footers appear. The parser must cope.
const REAL_TRANSCRIPT_LINES = [
  "Northeastern University",
  "Unofficial Academic Transcript",
  "This is not an official transcript. Courses which are in progress may also be included on this transcript.",
  "Transcript Data",
  "STUDENT INFORMATION",
  "Name",
  "Jae Hun Cho",
  "Primary Program",
  "M.S. in Computer Science",
  "College Campus Major and Department",
  "Khoury Coll of Comp Sciences Seattle, WA Computer Science, Computer",
  "Science",
  "DEGREE AWARDED",
  "Sought",
  "M.S. in Computer Science",
  "Primary Degree",
  "College Campus Major",
  "Khoury Coll of Comp Sciences Seattle, WA Computer Science",
  "INSTITUTION CREDIT",
  "Term : Fall 2024 Semester",
  "Academic Standing",
  "Good Standing",
  "Credit Quality Start and End CEU Contact",
  "Subject Course Level Title Grade R",
  "Hours Points Dates Hours",
  "Programming Design",
  "CS 5010 GR A- 4.000 14.668",
  "Paradigm",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 14.668 3.667",
  "Cumulative 4.000 4.000 4.000 4.000 14.668 3.667",
  "Term : Spring 2025 Semester",
  "Academic Standing",
  "Good Standing",
  "Credit Quality Start and End CEU Contact",
  "Subject Course Level Title Grade R",
  "Hours Points Dates Hours",
  "Pattern Recogn & Comput",
  "CS 5330 GR A- 4.000 14.668",
  "Vision",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 14.668 3.667",
  "Cumulative 8.000 8.000 8.000 8.000 29.336 3.667",
  "Term : Summer Full 2025 Semester",
  "Credit Quality Start and End CEU Contact",
  "Subject Course Level Title Grade R",
  "Hours Points Dates Hours",
  "Fndtns Artificial",
  "CS 5100 GR A 4.000 16.000",
  "Intelligence",
  "about:blank 1/2",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 4.000 4.000 4.000 4.000 16.000 4.000",
  "Cumulative 12.000 12.000 12.000 12.000 45.336 3.778",
  "Term : Spring 2026 Semester",
  "Academic Standing",
  "Good Standing",
  "Credit Quality Start and End CEU Contact",
  "Subject Course Level Title Grade R",
  "Hours Points Dates Hours",
  "Natural Language",
  "CS 6120 GR A 4.000 16.000",
  "Processing",
  "CS 6140 GR Machine Learning A 4.000 16.000",
  "Term Totals Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Current Term 8.000 8.000 8.000 8.000 32.000 4.000",
  "Cumulative 20.000 20.000 20.000 20.000 77.336 3.867",
  "TRANSCRIPT TOTALS",
  "Transcript Totals - (Graduate) Attempt Hours Passed Hours CEU Hours GPA Hours Quality Points GPA",
  "Total Institution 20.000 20.000 20.000 20.000 77.336 3.867",
  "Total Transfer 0.000 0.000 0.000 0.000 0.000 0.000",
  "Overall 20.000 20.000 20.000 20.000 77.336 3.867",
  "COURSE(S) IN PROGRESS",
  "Term : Summer 2026 Semester",
  "Subject Course Level Title Credit Hours Start and End Dates",
  "CS 5200 GR Database Management Sys 4.000",
  "CS 5340 GR Computer/Human Interaction 4.000",
  "CS 5700 GR Fundamentals - Computer Netwkg 4.000",
  "about:blank 2/2",
];

describe("parseTranscript", () => {
  let r: ParsedTranscript;
  beforeAll(() => { r = parseTranscript(REAL_TRANSCRIPT_LINES); });

  it("detects the program", () => { expect(r.program).toBe("mscs"); });

  it("parses 5 completed courses with rejoined titles", () => {
    expect(r.completed).toEqual([
      { subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, term: "202430", grade: "A-" },
      { subject: "CS", courseNumber: "5330", title: "Pattern Recogn & Comput Vision", credits: 4, term: "202510", grade: "A-" },
      { subject: "CS", courseNumber: "5100", title: "Fndtns Artificial Intelligence", credits: 4, term: "202550", grade: "A" },
      { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, term: "202610", grade: "A" },
      { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, term: "202610", grade: "A" },
    ]);
  });

  it("parses 3 in-progress courses", () => {
    expect(r.inProgress).toEqual([
      { subject: "CS", courseNumber: "5200", title: "Database Management Sys", credits: 4, term: "202650" },
      { subject: "CS", courseNumber: "5340", title: "Computer/Human Interaction", credits: 4, term: "202650" },
      { subject: "CS", courseNumber: "5700", title: "Fundamentals - Computer Netwkg", credits: 4, term: "202650" },
    ]);
  });

  it("emits no warnings for a clean transcript", () => { expect(r.warnings).toEqual([]); });
});

describe("parseTranscript edge cases", () => {
  it("skips not-earned grades (withdrawn)", () => {
    const lines = [
      "INSTITUTION CREDIT",
      "Term : Fall 2024 Semester",
      "Subject Course Level Title Grade Credit Hours Quality Points",
      "CS 5010 GR Programming Design Paradigm A- 4.000 14.668",
      "CS 5800 GR Algorithms W 0.000 0.000",
    ];
    const r = parseTranscript(lines);
    expect(r.completed).toHaveLength(1);
    expect(r.completed[0].courseNumber).toBe("5010");
  });

  it("returns empty arrays and a warning for non-transcript input", () => {
    const r = parseTranscript(["hello world", "not a transcript"]);
    expect(r.completed).toEqual([]);
    expect(r.inProgress).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
