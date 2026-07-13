import type { ProgramId } from "@/data/programs";
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
  "m.s. in computer science": "mscs",
  "m.s. in artificial intelligence": "msai",
  "m.s. in data science": "msds",
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

export interface ParsedTranscript {
  program?: ProgramId;
  completed: CompletedCourse[];
  inProgress: PlannedCourse[];
  studentName?: string;
  warnings: string[];
}

type Section = "HEADER" | "INSTITUTION_CREDIT" | "TOTALS" | "IN_PROGRESS";

const TERM_HEADER = /^Term\s*:\s*(.+?)(?:\s+Semester)?$/;

// In the real PDF text extraction, a course with a long title splits across
// three rows: a title fragment ABOVE the code row, a titleless code row, and a
// title fragment BELOW it. Short titles stay inline on the code row. These two
// patterns match the titleless variants; the titled variants are GRADED_ROW
// (completed) and IN_PROGRESS_ROW (in progress) defined above.
//   "CS 5010 GR A- 4.000 14.668"            -> titleless graded
const GRADED_TITLELESS =
  /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+([A-F][+-]?|S|U|W|I|IP|NF|L|X|TR?)\s+(\d+\.\d{3})\s+(-?\d+\.\d{3})$/;
//   "CS 5200 GR 4.000"                      -> titleless in progress
const IN_PROGRESS_TITLELESS = /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+[A-Z]{2}\s+(\d+\.\d{3})$/;

// Page-footer noise ("about:blank", bare "1/2") that pdf print injects.
function isNoise(line: string): boolean {
  return /^about:blank/i.test(line) || /^\d+\s*\/\s*\d+$/.test(line);
}

// Structural / chrome lines that are never course rows or title fragments.
// Note the column header wraps into three rows: "Credit Quality ... CEU Contact",
// "Subject Course Level Title Grade R", "Hours Points Dates Hours".
function isStructural(line: string): boolean {
  return (
    line.startsWith("Term Totals") ||
    line.startsWith("Current Term") ||
    line.startsWith("Cumulative") ||
    line.startsWith("Subject Course Level") ||
    line.startsWith("Credit Quality") ||
    line.startsWith("Hours Points") ||
    line.startsWith("Total ") ||
    line.startsWith("Transcript Totals") ||
    line === "Academic Standing" ||
    line === "Good Standing"
  );
}

function isSectionOrTerm(line: string): boolean {
  return (
    line.startsWith("INSTITUTION CREDIT") ||
    line.startsWith("TRANSCRIPT TOTALS") ||
    line.startsWith("COURSE(S) IN PROGRESS") ||
    TERM_HEADER.test(line)
  );
}

// The single plain-text line immediately following a titleless code row is the
// rest of that course's title. Returns the suffix and the index it consumed, or
// null if the next line isn't a title fragment.
function takeTitleSuffix(
  lines: string[],
  from: number
): { suffix: string; consumed: number } | null {
  let j = from + 1;
  while (j < lines.length && !lines[j].trim()) j++;
  if (j >= lines.length) return null;
  const next = lines[j].trim();
  if (
    isNoise(next) ||
    isStructural(next) ||
    isSectionOrTerm(next) ||
    GRADED_ROW.test(next) ||
    GRADED_TITLELESS.test(next) ||
    IN_PROGRESS_ROW.test(next) ||
    IN_PROGRESS_TITLELESS.test(next)
  ) {
    return null;
  }
  return { suffix: next, consumed: j };
}

export function parseTranscript(lines: string[]): ParsedTranscript {
  const result: ParsedTranscript = { completed: [], inProgress: [], warnings: [] };
  let section: Section = "HEADER";
  let term = "";
  let titlePrefix: string[] = []; // plain-text fragment(s) seen above a code row

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isNoise(line)) continue;

    if (line === "Primary Program") {
      const next = lines[i + 1]?.trim();
      if (next) result.program = programToId(next);
      titlePrefix = [];
      continue;
    }
    if (line === "Name") {
      const next = lines[i + 1]?.trim();
      if (next) result.studentName = next;
      titlePrefix = [];
      continue;
    }
    if (line.startsWith("INSTITUTION CREDIT")) { section = "INSTITUTION_CREDIT"; titlePrefix = []; continue; }
    if (line.startsWith("TRANSCRIPT TOTALS")) { section = "TOTALS"; titlePrefix = []; continue; }
    if (line.startsWith("COURSE(S) IN PROGRESS")) { section = "IN_PROGRESS"; titlePrefix = []; continue; }

    const termMatch = line.match(TERM_HEADER);
    if (termMatch) {
      term = termToCode(termMatch[1]);
      if (!term) result.warnings.push(`Unrecognized term: "${termMatch[1]}"`);
      titlePrefix = [];
      continue;
    }

    if (isStructural(line)) { titlePrefix = []; continue; }

    if (section === "INSTITUTION_CREDIT" && term) {
      const titled = parseGradedRow(line, term);
      if (titled) {
        if (isEarnedGrade(titled.grade ?? "")) result.completed.push(titled);
        titlePrefix = [];
        continue;
      }
      const tl = line.match(GRADED_TITLELESS);
      if (tl) {
        const titleParts = [...titlePrefix];
        const suffix = takeTitleSuffix(lines, i);
        if (suffix) { titleParts.push(suffix.suffix); i = suffix.consumed; }
        const grade = tl[3];
        if (isEarnedGrade(grade)) {
          result.completed.push({
            subject: tl[1],
            courseNumber: tl[2],
            title: titleParts.join(" ").trim(),
            credits: Math.round(parseFloat(tl[4])),
            term,
            grade,
          });
        }
        titlePrefix = [];
        continue;
      }
      titlePrefix.push(line);
    } else if (section === "IN_PROGRESS" && term) {
      const titled = parseInProgressRow(line, term);
      if (titled) {
        result.inProgress.push(titled);
        titlePrefix = [];
        continue;
      }
      const tl = line.match(IN_PROGRESS_TITLELESS);
      if (tl) {
        const titleParts = [...titlePrefix];
        const suffix = takeTitleSuffix(lines, i);
        if (suffix) { titleParts.push(suffix.suffix); i = suffix.consumed; }
        result.inProgress.push({
          subject: tl[1],
          courseNumber: tl[2],
          title: titleParts.join(" ").trim(),
          credits: Math.round(parseFloat(tl[3])),
          term,
        });
        titlePrefix = [];
        continue;
      }
      titlePrefix.push(line);
    }
  }

  if (result.completed.length === 0 && result.inProgress.length === 0) {
    result.warnings.push(
      "No courses recognized — is this the NEU Unofficial Academic Transcript PDF?"
    );
  }
  return result;
}
