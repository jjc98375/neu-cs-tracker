/**
 * Northeastern University Graduate CS program requirements.
 *
 * Programs covered:
 *  - MS Computer Science (MSCS)
 *  - MS Artificial Intelligence (MSAI)
 *  - MS Data Science (MSDS)
 *
 * Based on the 2024-2026 Northeastern Graduate Catalog.
 * https://catalog.northeastern.edu/graduate/computer-information-science/
 */

import type {
  RequirementCourse,
  CompletedCourse,
  PlannedCourse,
  RequirementStatus,
  GraduationAnalysis,
} from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// MS Computer Science (32 credits)
// ──────────────────────────────────────────────────────────────────────────────
// Requirements: complete 8 graduate courses (32 credits).
// Breadth: at least one course in each of the four breadth areas:
//   A: Systems (e.g. CS 5600, CS 6650)
//   B: Theory / Algorithms (e.g. CS 5800)
//   C: AI / Machine Learning (e.g. CS 6140)
//   D: Software Engineering / Applications (e.g. CS 5500)
// Plus a capstone (CS 6965) or thesis option.

export const MSCS_REQUIREMENTS: RequirementCourse[] = [
  // ── Breadth A: Systems ───────────────────────────────────────────────────
  { subject: "CS", courseNumber: "5600", title: "Computer Systems", credits: 4, category: "Systems", required: false, groupId: "mscs-systems", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6650", title: "Building Scalable Distributed Systems", credits: 4, category: "Systems", required: false, groupId: "mscs-systems", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6740", title: "Network Security", credits: 4, category: "Systems", required: false, groupId: "mscs-systems", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6620", title: "Parallel Computing for Data Analytics", credits: 4, category: "Systems", required: false, groupId: "mscs-systems", groupMinCount: 1 },

  // ── Breadth B: Theory / Algorithms ───────────────────────────────────────
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Theory", required: false, groupId: "mscs-theory", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6820", title: "Analysis of Algorithms", credits: 4, category: "Theory", required: false, groupId: "mscs-theory", groupMinCount: 1 },

  // ── Breadth C: AI / ML ────────────────────────────────────────────────────
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Applications", required: false, groupId: "mscs-ai", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Applications", required: false, groupId: "mscs-ai", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6220", title: "Big Data Indexing and Mining", credits: 4, category: "Applications", required: false, groupId: "mscs-ai", groupMinCount: 1 },

  // ── Breadth D: Software Engineering / Applications ────────────────────────
  { subject: "CS", courseNumber: "5500", title: "Managing Software Development", credits: 4, category: "Core", required: false, groupId: "mscs-se", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5200", title: "Database Management Systems", credits: 4, category: "Core", required: false, groupId: "mscs-se", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5010", title: "Program Design Paradigms", credits: 4, category: "Core", required: false, groupId: "mscs-se", groupMinCount: 1 },

  // ── Capstone (required) ───────────────────────────────────────────────────
  { subject: "CS", courseNumber: "6965", title: "Align Capstone", credits: 4, category: "Capstone", required: false, groupId: "mscs-capstone", groupMinCount: 1 },
  { subject: "CS", courseNumber: "7990", title: "Research", credits: 4, category: "Capstone", required: false, groupId: "mscs-capstone", groupMinCount: 1 },
];

export const MSCS_TOTAL_CREDITS = 32;
export const MSCS_ELECTIVE_MIN_CREDITS = 0; // remaining filled by 5000-7999 electives
export const MSCS_ELECTIVE_MIN_NUMBER = 5000;
export const MSCS_ELECTIVE_MAX_NUMBER = 7999;

// ──────────────────────────────────────────────────────────────────────────────
// MS Artificial Intelligence (32 credits)
// ──────────────────────────────────────────────────────────────────────────────
// 3 required courses + 5 electives.  All must be 5000-level or above.

export const MSAI_REQUIREMENTS: RequirementCourse[] = [
  // ── Core required ─────────────────────────────────────────────────────────
  { subject: "CS", courseNumber: "5100", title: "Foundations of Artificial Intelligence", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Core", required: true },

  // ── AI Electives (choose from list, need ≥ 5 courses total) ───────────────
  // Any 5000-7999 CS courses count; these are popular/recommended choices:
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6240", title: "Web Mining", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6220", title: "Big Data Indexing and Mining", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6200", title: "Information Retrieval", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6400", title: "Computer Vision", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6420", title: "Biologically Inspired Computation", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "7150", title: "Deep Learning", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "7180", title: "Special Topics in AI", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "CS", courseNumber: "6600", title: "Intelligent Systems: Reasoning and Decision Making", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
  { subject: "DS", courseNumber: "5010", title: "Intro to Data Management and Processing", credits: 4, category: "Elective", required: false, groupId: "msai-elective", groupMinCount: 5 },
];

export const MSAI_TOTAL_CREDITS = 32;

// ──────────────────────────────────────────────────────────────────────────────
// MS Data Science (32 credits)
// ──────────────────────────────────────────────────────────────────────────────
// 4 required core courses + electives to reach 32 credits.

export const MSDS_REQUIREMENTS: RequirementCourse[] = [
  // ── Required core ─────────────────────────────────────────────────────────
  { subject: "DS", courseNumber: "5010", title: "Intro to Data Management and Processing", credits: 4, category: "Core", required: true },
  { subject: "DS", courseNumber: "5020", title: "Intro to Data Science and Statistics", credits: 4, category: "Core", required: true },
  { subject: "DS", courseNumber: "5110", title: "Data Management and Processing", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Core", required: true },

  // ── Required depth: choose 1 analytics course ─────────────────────────────
  { subject: "CS", courseNumber: "6220", title: "Big Data Indexing and Mining", credits: 4, category: "Applications", required: false, groupId: "msds-analytics", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6200", title: "Information Retrieval", credits: 4, category: "Applications", required: false, groupId: "msds-analytics", groupMinCount: 1 },
  { subject: "DS", courseNumber: "5500", title: "Data Science Capstone", credits: 4, category: "Applications", required: false, groupId: "msds-analytics", groupMinCount: 1 },

  // ── Required depth: choose 1 computation course ───────────────────────────
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Theory", required: false, groupId: "msds-computation", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6600", title: "Intelligent Systems", credits: 4, category: "Theory", required: false, groupId: "msds-computation", groupMinCount: 1 },

  // ── Electives (5000-7999) — fill remaining credits ──────────────────────
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6400", title: "Computer Vision", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7150", title: "Deep Learning", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6240", title: "Web Mining", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
  { subject: "DS", courseNumber: "5230", title: "Collecting, Storing, and Retrieving Data", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
  { subject: "DS", courseNumber: "5300", title: "Machine Learning Fundamentals", credits: 4, category: "Elective", required: false, groupId: "msds-elective", groupMinCount: 4 },
];

export const MSDS_TOTAL_CREDITS = 32;

// ──────────────────────────────────────────────────────────────────────────────
// Program registry
// ──────────────────────────────────────────────────────────────────────────────

export type ProgramId = "MSCS" | "MSAI" | "MSDS";

export interface Program {
  id: ProgramId;
  name: string;
  totalCredits: number;
  requirements: RequirementCourse[];
  electiveMinNumber: number;
  electiveMaxNumber: number;
}

export const PROGRAMS: Record<ProgramId, Program> = {
  MSCS: {
    id: "MSCS",
    name: "MS Computer Science",
    totalCredits: MSCS_TOTAL_CREDITS,
    requirements: MSCS_REQUIREMENTS,
    electiveMinNumber: MSCS_ELECTIVE_MIN_NUMBER,
    electiveMaxNumber: MSCS_ELECTIVE_MAX_NUMBER,
  },
  MSAI: {
    id: "MSAI",
    name: "MS Artificial Intelligence",
    totalCredits: MSAI_TOTAL_CREDITS,
    requirements: MSAI_REQUIREMENTS,
    electiveMinNumber: 5000,
    electiveMaxNumber: 7999,
  },
  MSDS: {
    id: "MSDS",
    name: "MS Data Science",
    totalCredits: MSDS_TOTAL_CREDITS,
    requirements: MSDS_REQUIREMENTS,
    electiveMinNumber: 5000,
    electiveMaxNumber: 7999,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Analysis engine
// ──────────────────────────────────────────────────────────────────────────────

function courseKey(subject: string, courseNumber: string) {
  return `${subject.toUpperCase()}-${courseNumber}`;
}

function termToSortKey(termCode: string): number {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  const order: Record<string, number> = {
    "10": 1,
    "40": 2,
    "50": 2,
    "60": 3,
    "30": 4,
  };
  return year * 10 + (order[suffix] ?? 5);
}

function termDescription(termCode: string): string {
  const year = termCode.slice(0, 4);
  const suffix = termCode.slice(-2);
  const map: Record<string, string> = {
    "10": "Spring",
    "30": "Fall",
    "40": "Summer 1",
    "50": "Summer",
    "60": "Summer 2",
  };
  return `${map[suffix] ?? suffix} ${year}`;
}

function nextTerm(termCode: string): string {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  if (suffix === "10") return `${year}30`; // Spring → Fall
  if (suffix === "30") return `${year + 1}10`; // Fall → next Spring
  if (suffix === "40") return `${year}60`; // Summer 1 → Summer 2
  if (suffix === "60") return `${year}30`; // Summer 2 → Fall
  if (suffix === "50") return `${year}30`; // Summer Full → Fall
  return `${year + 1}10`;
}

export function analyzeGraduation(
  programId: ProgramId,
  completed: CompletedCourse[],
  planned: PlannedCourse[]
): GraduationAnalysis {
  const program = PROGRAMS[programId];
  const completedMap = new Map(
    completed.map((c) => [courseKey(c.subject, c.courseNumber), c])
  );
  const plannedMap = new Map(
    planned.map((c) => [courseKey(c.subject, c.courseNumber), c])
  );

  const requirementStatuses: RequirementStatus[] = program.requirements.map(
    (req) => {
      const key = courseKey(req.subject, req.courseNumber);
      const comp = completedMap.get(key);
      const plan = plannedMap.get(key);
      if (comp) return { requirement: req, status: "completed", completedBy: comp };
      if (plan) return { requirement: req, status: "planned", plannedBy: plan };
      return { requirement: req, status: "missing" };
    }
  );

  const completedCredits = completed.reduce((s, c) => s + c.credits, 0);
  const plannedCredits = planned.reduce((s, c) => s + c.credits, 0);
  const remaining = Math.max(0, program.totalCredits - completedCredits - plannedCredits);

  // Check individual required courses
  const missingRequired = requirementStatuses
    .filter((s) => s.requirement.required && s.status === "missing")
    .map((s) => s.requirement);

  // Check group requirements — count how many from each groupId are fulfilled
  const groupFilled = new Map<string, number>();
  for (const s of requirementStatuses) {
    if (!s.requirement.groupId) continue;
    if (s.status === "completed" || s.status === "planned") {
      groupFilled.set(
        s.requirement.groupId,
        (groupFilled.get(s.requirement.groupId) ?? 0) + 1
      );
    }
  }

  // Find groups where we haven't met the minimum
  const missingGroupCourses: RequirementCourse[] = [];
  const seenGroups = new Set<string>();
  for (const req of program.requirements) {
    if (!req.groupId || !req.groupMinCount || seenGroups.has(req.groupId)) continue;
    seenGroups.add(req.groupId);
    const filled = groupFilled.get(req.groupId) ?? 0;
    if (filled < req.groupMinCount) missingGroupCourses.push(req);
  }

  const onTrack =
    missingRequired.length === 0 &&
    missingGroupCourses.length === 0 &&
    remaining === 0;

  // Expected graduation term
  let expectedGraduationTerm: string | null = null;
  const allTerms = [
    ...completed.map((c) => c.term),
    ...planned.map((c) => c.term),
  ];
  if (allTerms.length > 0) {
    const lastTerm = allTerms.sort(
      (a, b) => termToSortKey(b) - termToSortKey(a)
    )[0];
    if (remaining <= 0) {
      expectedGraduationTerm = termDescription(lastTerm);
    } else {
      // Assume 8–12 credits per semester (2–3 courses)
      const semestersNeeded = Math.ceil(remaining / 8);
      let term = lastTerm;
      for (let i = 0; i < semestersNeeded; i++) term = nextTerm(term);
      expectedGraduationTerm = termDescription(term);
    }
  }

  return {
    totalCreditsRequired: program.totalCredits,
    totalCreditsCompleted: completedCredits,
    totalCreditsPlanned: plannedCredits,
    totalCreditsRemaining: remaining,
    requirementStatuses,
    missingRequirements: [...missingRequired, ...missingGroupCourses],
    expectedGraduationTerm,
    onTrack,
  };
}
