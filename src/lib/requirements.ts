/**
 * Northeastern University Graduate CS program requirements.
 *
 * Programs covered:
 *  - MS Computer Science (MSCS) — Seattle campus
 *  - MS Artificial Intelligence (MSAI) — Seattle campus
 *  - MS Data Science (MSDS) — Boston campus
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
// MS Computer Science — Seattle (32 credits, min 3.000 GPA)
// ──────────────────────────────────────────────────────────────────────────────
// Core: CS 5010 (4cr) + CS 5800 (4cr) = 8 credits required
// Breadth: 3 courses from 2 of the 3 breadth areas (12 credits)
//   NOTE: catalog says "2 of 3 areas", but we model each area with
//   groupMinCount: 1 for simplicity. This is slightly stricter.
// Electives: 3 courses (12 credits) from approved list
// Capstone/Thesis: not explicitly required in coursework list

export const MSCS_REQUIREMENTS: RequirementCourse[] = [
  // ── Required Core ────────────────────────────────────────────────────────
  { subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Core", required: true },

  // ── Breadth: AI & Data Science (choose ≥1) ──────────────────────────────
  { subject: "CS", courseNumber: "5100", title: "Foundations of Artificial Intelligence", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5150", title: "Game Artificial Intelligence", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5200", title: "Database Management Systems", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5330", title: "Pattern Recognition and Computer Vision", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6200", title: "Information Retrieval", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6220", title: "Data Mining Techniques", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6240", title: "Large-Scale Parallel Data Processing", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },
  { subject: "CS", courseNumber: "7140", title: "Advanced Machine Learning", credits: 4, category: "Applications", required: false, groupId: "mscs-ai-ds", groupMinCount: 1 },

  // ── Breadth: Systems & Software (choose ≥1) ─────────────────────────────
  { subject: "CS", courseNumber: "5400", title: "Principles of Programming Language", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5500", title: "Foundations of Software Engineering", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5520", title: "Mobile Application Development", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5600", title: "Computer Systems", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5610", title: "Web Development", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5700", title: "Fundamentals of Computer Networking", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "5850", title: "Building Game Engines", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6410", title: "Compilers", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6510", title: "Advanced Software Development", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6620", title: "Fundamentals of Cloud Computing", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },
  { subject: "CS", courseNumber: "6650", title: "Building Scalable Distributed Systems", credits: 4, category: "Systems", required: false, groupId: "mscs-sys-sw", groupMinCount: 1 },

  // ── Breadth: Theory & Security (choose ≥1) ──────────────────────────────
  { subject: "CS", courseNumber: "6760", title: "Privacy, Security, and Usability", credits: 4, category: "Theory", required: false, groupId: "mscs-theory-sec", groupMinCount: 1 },
  { subject: "CS", courseNumber: "7805", title: "Complexity Theory", credits: 4, category: "Theory", required: false, groupId: "mscs-theory-sec", groupMinCount: 1 },
  { subject: "CY", courseNumber: "5770", title: "Software Vulnerabilities and Security", credits: 4, category: "Theory", required: false, groupId: "mscs-theory-sec", groupMinCount: 1 },
  { subject: "CY", courseNumber: "6740", title: "Network Security", credits: 4, category: "Theory", required: false, groupId: "mscs-theory-sec", groupMinCount: 1 },
];

export const MSCS_TOTAL_CREDITS = 32;
export const MSCS_ELECTIVE_MIN_CREDITS = 12; // 3 elective courses
export const MSCS_ELECTIVE_MIN_NUMBER = 5000;
export const MSCS_ELECTIVE_MAX_NUMBER = 7999;

// ──────────────────────────────────────────────────────────────────────────────
// MS Artificial Intelligence — Seattle (32 credits, min 3.000 GPA)
// ──────────────────────────────────────────────────────────────────────────────
// Core: 5 required courses (20 credits)
// Specialization/Electives: 3 courses (12 credits) from specialization areas
//   5 specialization areas: Vision, Intelligent Interaction, Robotics, ML,
//   Knowledge Management & Reasoning
//   Paths: Specialization (2 from 1 area + 1 elective),
//          Coursework-only (3 from any), or Thesis

export const MSAI_REQUIREMENTS: RequirementCourse[] = [
  // ── Required Core (20 credits) ──────────────────────────────────────────
  { subject: "CS", courseNumber: "5100", title: "Foundations of Artificial Intelligence", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5010", title: "Programming Design Paradigm", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5170", title: "AI for Human-Computer Interaction", credits: 4, category: "Core", required: true },

  // ── Specialization electives (choose ≥3 from any area) ──────────────────
  // Vision
  { subject: "CS", courseNumber: "5330", title: "Pattern Recognition and Computer Vision", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "7180", title: "Special Topics in Artificial Intelligence", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  // Intelligent Interaction
  { subject: "CS", courseNumber: "5150", title: "Game Artificial Intelligence", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "5340", title: "Computer/Human Interaction", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "7340", title: "Theory and Methods in HCI", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  // Robotics and Agent-Based Systems
  { subject: "CS", courseNumber: "5180", title: "Reinforcement Learning and Sequential Decision Making", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "5335", title: "Robotic Science and Systems", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  // Machine Learning
  { subject: "CS", courseNumber: "6220", title: "Data Mining Techniques", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "7140", title: "Advanced Machine Learning", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "7150", title: "Deep Learning", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "DS", courseNumber: "5230", title: "Unsupervised Machine Learning and Data Mining", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  // Knowledge Management and Reasoning
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "6200", title: "Information Retrieval", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
  { subject: "CS", courseNumber: "7290", title: "Special Topics in Data Science", credits: 4, category: "Elective", required: false, groupId: "msai-spec", groupMinCount: 3 },
];

export const MSAI_TOTAL_CREDITS = 32;

// ──────────────────────────────────────────────────────────────────────────────
// MS Data Science — Boston (32 credits, min 3.000 GPA)
// ──────────────────────────────────────────────────────────────────────────────
// Core: 4 required courses (16 credits)
//   DS 5110, CS 5800, CS 6140, DS 5500
// Concentration: 4 courses (16 credits) — CS concentration listed below

export const MSDS_REQUIREMENTS: RequirementCourse[] = [
  // ── Required Core (16 credits) ──────────────────────────────────────────
  { subject: "DS", courseNumber: "5110", title: "Essentials of Data Science", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "5800", title: "Algorithms", credits: 4, category: "Core", required: true },
  { subject: "CS", courseNumber: "6140", title: "Machine Learning", credits: 4, category: "Core", required: true },
  { subject: "DS", courseNumber: "5500", title: "Data Science Capstone", credits: 4, category: "Capstone", required: true },

  // ── CS Concentration (choose ≥4 from list, 16 credits) ──────────────────
  { subject: "CS", courseNumber: "5100", title: "Foundations of Artificial Intelligence", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "5180", title: "Reinforcement Learning and Sequential Decision Making", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "5200", title: "Database Management Systems", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "5330", title: "Pattern Recognition and Computer Vision", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "5340", title: "Computer/Human Interaction", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "5610", title: "Web Development", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6120", title: "Natural Language Processing", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6200", title: "Information Retrieval", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6220", title: "Data Mining Techniques", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6240", title: "Large-Scale Parallel Data Processing", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6350", title: "Empirical Research Methods", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6620", title: "Fundamentals of Cloud Computing", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "6650", title: "Building Scalable Distributed Systems", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7140", title: "Advanced Machine Learning", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7150", title: "Deep Learning", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7180", title: "Special Topics in Artificial Intelligence", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7200", title: "Statistical Methods for Computer Science", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7250", title: "Information Visualization", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
  { subject: "CS", courseNumber: "7290", title: "Special Topics in Data Science", credits: 4, category: "Elective", required: false, groupId: "msds-cs-conc", groupMinCount: 4 },
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
    name: "MS Computer Science (Seattle)",
    totalCredits: MSCS_TOTAL_CREDITS,
    requirements: MSCS_REQUIREMENTS,
    electiveMinNumber: MSCS_ELECTIVE_MIN_NUMBER,
    electiveMaxNumber: MSCS_ELECTIVE_MAX_NUMBER,
  },
  MSAI: {
    id: "MSAI",
    name: "MS Artificial Intelligence (Seattle)",
    totalCredits: MSAI_TOTAL_CREDITS,
    requirements: MSAI_REQUIREMENTS,
    electiveMinNumber: 5000,
    electiveMaxNumber: 7999,
  },
  MSDS: {
    id: "MSDS",
    name: "MS Data Science (Boston)",
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
