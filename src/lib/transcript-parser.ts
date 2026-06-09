import type { ProgramId } from "@/lib/requirements";
import type { CompletedCourse, PlannedCourse } from "@/lib/types";

const SEASON_SUFFIX: Record<string, string> = {
  Spring: "10",
  Summer: "50",
  Fall: "30",
};

/** "Fall 2024 Semester" | "Summer Full 2025 Semester" -> "202430" | "202550" */
export function termToCode(term: string): string {
  const seasonMatch = term.match(/\b(Spring|Summer|Fall)\b/);
  const yearMatch = term.match(/\b(20\d{2})\b/);
  if (!seasonMatch || !yearMatch) return "";
  const suffix = SEASON_SUFFIX[seasonMatch[1]];
  if (!suffix) return "";
  return `${yearMatch[1]}${suffix}`;
}

const PROGRAM_MAP: Record<string, ProgramId> = {
  "m.s. in computer science": "MSCS",
  "m.s. in artificial intelligence": "MSAI",
  "m.s. in data science": "MSDS",
};

export function programToId(program: string): ProgramId | undefined {
  return PROGRAM_MAP[program.trim().toLowerCase()];
}

const NOT_EARNED = new Set(["W", "I", "IP", "NF", "U", "L", "X"]);

/** True if a grade means the course was earned (counts toward the degree). */
export function isEarnedGrade(grade: string): boolean {
  return !NOT_EARNED.has(grade.trim().toUpperCase());
}

// Graded row: SUBJ NUM LEVEL <title...> GRADE CREDIT QUALITYPOINTS
// e.g. "CS 5010 GR Programming Design Paradigm A- 4.000 14.668"
const GRADED_ROW =
  /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+(.+?)\s+([A-F][+-]?|S|U|W|I|IP|NF|L|X|TR?)\s+(\d+\.\d{3})\s+(-?\d+\.\d{3})$/;

export function parseGradedRow(line: string, term: string): CompletedCourse | null {
  const m = line.trim().match(GRADED_ROW);
  if (!m) return null;
  return {
    subject: m[1],
    courseNumber: m[2],
    title: m[3].trim(),
    credits: Math.round(parseFloat(m[5])),
    term,
    grade: m[4],
  };
}

// In-progress row: SUBJ NUM LEVEL <title...> CREDIT   (no grade, no quality points)
// e.g. "CS 5200 GR Database Management Sys 4.000"
const IN_PROGRESS_ROW = /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+(.+?)\s+(\d+\.\d{3})$/;

export function parseInProgressRow(line: string, term: string): PlannedCourse | null {
  const m = line.trim().match(IN_PROGRESS_ROW);
  if (!m) return null;
  return {
    subject: m[1],
    courseNumber: m[2],
    title: m[3].trim(),
    credits: Math.round(parseFloat(m[4])),
    term,
  };
}
