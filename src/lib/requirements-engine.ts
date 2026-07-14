/**
 * Requirement-tree interpreter (engine v2).
 *
 * Allocation: completed courses (then planned) form a pool; each pool entry
 * is consumed at most once. Exact `course` leaves claim first (depth-first
 * document order), then `range` leaves claim what remains — at most one
 * course when the range sits under allOf/chooseN, or up to the group's
 * credit target when under chooseCredits.
 */

import type {
  ProgramV2,
  RequirementNode,
} from "./program-schema";
import type { CompletedCourse, PlannedCourse } from "./types";

export type MatchKind = "completed" | "planned";

export interface CourseMatch {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
  term: string;
  kind: MatchKind;
}

export type NodeState = "complete" | "planned" | "partial" | "missing";

export interface NodeStatus {
  node: RequirementNode;
  state: NodeState;
  earned: number;
  required: number;
  unit: "courses" | "credits";
  matches: CourseMatch[];
  children: NodeStatus[];
}

interface PoolEntry {
  match: CourseMatch;
  consumed: boolean;
}

function buildPool(completed: CompletedCourse[], planned: PlannedCourse[]): PoolEntry[] {
  const entries: PoolEntry[] = [];
  for (const c of completed)
    entries.push({
      consumed: false,
      match: { subject: c.subject, courseNumber: c.courseNumber, title: c.title, credits: c.credits, term: c.term, kind: "completed" },
    });
  for (const p of planned)
    entries.push({
      consumed: false,
      match: { subject: p.subject, courseNumber: p.courseNumber, title: p.title, credits: p.credits, term: p.term, kind: "planned" },
    });
  return entries;
}

/** Pass 1: exact course leaves claim pool entries, depth-first. */
function allocateExact(node: RequirementNode, pool: PoolEntry[], leafMatches: Map<RequirementNode, CourseMatch[]>): void {
  if (node.type === "course") {
    const entry = pool.find(
      (e) => !e.consumed &&
        e.match.subject.toUpperCase() === node.subject.toUpperCase() &&
        e.match.courseNumber === node.number
    );
    if (entry) {
      entry.consumed = true;
      leafMatches.set(node, [entry.match]);
    }
    return;
  }
  if (node.type === "range") return;
  for (const child of node.children) allocateExact(child, pool, leafMatches);
}

function rangeMatches(node: Extract<RequirementNode, { type: "range" }>, e: PoolEntry): boolean {
  if (e.consumed) return false;
  if (e.match.subject.toUpperCase() !== node.subject.toUpperCase()) return false;
  const num = parseInt(e.match.courseNumber, 10);
  return !Number.isNaN(num) && num >= node.minNumber && num <= node.maxNumber;
}

/** Sum of credits already claimed (pass 1) by course leaves in this subtree. */
function claimedCourseCredits(
  node: RequirementNode,
  leafMatches: Map<RequirementNode, CourseMatch[]>
): number {
  if (node.type === "course")
    return (leafMatches.get(node) ?? []).reduce((s, m) => s + m.credits, 0);
  if (node.type === "range") return 0;
  return node.children.reduce((s, c) => s + claimedCourseCredits(c, leafMatches), 0);
}

/**
 * Pass 2: range leaves claim remaining pool entries. Inside a chooseCredits
 * subtree, all descendant ranges share the group's credit budget (pre-reduced
 * by every course credit pass 1 claimed anywhere in the subtree). A range whose
 * DIRECT parent is allOf/chooseN claims at most one course (still decrementing
 * the shared budget when one is active); a range directly under chooseCredits
 * claims until the budget is met. Nested chooseCredits groups keep independent
 * budgets.
 */
function allocateRanges(
  node: RequirementNode,
  pool: PoolEntry[],
  leafMatches: Map<RequirementNode, CourseMatch[]>,
  creditBudget: { remaining: number } | null,
  singleClaim: boolean
): void {
  if (node.type === "course") return;
  if (node.type === "range") {
    const matches: CourseMatch[] = [];
    for (const e of pool) {
      if (creditBudget && creditBudget.remaining <= 0) break;
      if (singleClaim && matches.length >= 1) break;
      if (rangeMatches(node, e)) {
        e.consumed = true;
        if (creditBudget) creditBudget.remaining -= e.match.credits;
        matches.push(e.match);
      }
    }
    if (matches.length) leafMatches.set(node, matches);
    return;
  }
  if (node.type === "chooseCredits") {
    const budget = { remaining: node.credits - claimedCourseCredits(node, leafMatches) };
    for (const child of node.children) allocateRanges(child, pool, leafMatches, budget, false);
    return;
  }
  // allOf / chooseN: propagate any active budget; direct range children claim once.
  for (const child of node.children) allocateRanges(child, pool, leafMatches, creditBudget, true);
}

function subtreeCredits(status: NodeStatus): number {
  const own = status.matches.reduce((s, m) => s + m.credits, 0);
  return own + status.children.reduce((s, c) => s + subtreeCredits(c), 0);
}

function evaluate(node: RequirementNode, leafMatches: Map<RequirementNode, CourseMatch[]>): NodeStatus {
  if (node.type === "course" || node.type === "range") {
    const matches = leafMatches.get(node) ?? [];
    const state: NodeState =
      matches.length === 0 ? "missing"
      : matches.some((m) => m.kind === "completed") ? "complete"
      : "planned";
    return {
      node, state,
      earned: matches.length > 0 ? 1 : 0,
      required: 1,
      unit: "courses",
      matches,
      children: [],
    };
  }

  const children = node.children.map((c) => evaluate(c, leafMatches));
  const satisfiedChildren = children.filter((c) => c.state === "complete" || c.state === "planned").length;

  if (node.type === "chooseCredits") {
    const earned = children.reduce((s, c) => s + subtreeCredits(c), 0);
    const state: NodeState =
      earned >= node.credits ? "complete" : earned > 0 ? "partial" : "missing";
    return { node, state, earned, required: node.credits, unit: "credits", matches: [], children };
  }

  const required = node.type === "chooseN" ? node.n : node.children.length;
  const anyProgress = satisfiedChildren > 0 || children.some((c) => c.state === "partial");
  const state: NodeState =
    satisfiedChildren >= required ? "complete" : anyProgress ? "partial" : "missing";
  return { node, state, earned: satisfiedChildren, required, unit: "courses", matches: [], children };
}

export function evaluateTree(
  root: RequirementNode,
  completed: CompletedCourse[],
  planned: PlannedCourse[]
): NodeStatus {
  const pool = buildPool(completed, planned);
  const leafMatches = new Map<RequirementNode, CourseMatch[]>();
  allocateExact(root, pool, leafMatches);
  allocateRanges(root, pool, leafMatches, null, true);
  return evaluate(root, leafMatches);
}

// ── Analysis summary ─────────────────────────────────────────────────────────

export interface MissingItem {
  label: string;
  detail: string;
}

export interface AnalysisV2 {
  program: ProgramV2;
  totalCreditsRequired: number;
  totalCreditsCompleted: number;
  totalCreditsPlanned: number;
  totalCreditsRemaining: number;
  root: NodeStatus;
  missing: MissingItem[];
  expectedGraduationTerm: string | null;
  onTrack: boolean;
}

function termToSortKey(termCode: string): number {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  // Strict order within a year: Spring < Summer 1 < Full Summer < Summer 2 < Fall.
  const order: Record<string, number> = { "10": 1, "40": 2, "50": 3, "60": 4, "30": 5 };
  return year * 10 + (order[suffix] ?? 5);
}

function termDescription(termCode: string): string {
  const year = termCode.slice(0, 4);
  const suffix = termCode.slice(-2);
  const map: Record<string, string> = {
    "10": "Spring", "30": "Fall", "40": "Summer 1", "50": "Summer", "60": "Summer 2",
  };
  return `${map[suffix] ?? suffix} ${year}`;
}

function nextTerm(termCode: string): string {
  const year = parseInt(termCode.slice(0, 4), 10);
  const suffix = termCode.slice(-2);
  if (suffix === "10") return `${year}30`;
  if (suffix === "30") return `${year + 1}10`;
  if (suffix === "40") return `${year}60`;
  if (suffix === "60") return `${year}30`;
  if (suffix === "50") return `${year}30`;
  return `${year + 1}10`;
}

/**
 * Collect actionable gaps: unmet course leaves that are strictly required
 * (direct child of an allOf chain from the root) and unmet groups (with
 * their shortfall). Options inside an unmet chooseN/chooseCredits are not
 * listed individually — the group entry covers them.
 */
function collectMissing(status: NodeStatus, out: MissingItem[], underAllOf: boolean): void {
  const node = status.node;
  if (node.type === "course") {
    if (underAllOf && status.state === "missing")
      out.push({ label: `${node.subject} ${node.number} — ${node.title}`, detail: "required" });
    return;
  }
  if (node.type === "range") return;
  if (node.type === "allOf") {
    for (const child of status.children) collectMissing(child, out, true);
    return;
  }
  // chooseN / chooseCredits
  if (status.state !== "complete") {
    const shortfall = status.required - status.earned;
    out.push({
      label: node.label,
      detail: status.unit === "credits"
        ? `${shortfall} more credit${shortfall === 1 ? "" : "s"}`
        : `${shortfall} more course${shortfall === 1 ? "" : "s"}`,
    });
  }
}

const CREDITS_PER_TERM: Record<ProgramV2["level"], number | null> = {
  UG: 16,
  MS: 8,
  PhD: null,
};

export function analyzeGraduation(
  program: ProgramV2,
  completed: CompletedCourse[],
  planned: PlannedCourse[]
): AnalysisV2 {
  const root = evaluateTree(program.requirements, completed, planned);

  const totalCreditsCompleted = completed.reduce((s, c) => s + c.credits, 0);
  const totalCreditsPlanned = planned.reduce((s, c) => s + c.credits, 0);
  const totalCreditsRemaining = Math.max(
    0,
    program.totalCredits - totalCreditsCompleted - totalCreditsPlanned
  );

  const missing: MissingItem[] = [];
  collectMissing(root, missing, false);

  const onTrack = root.state === "complete" && totalCreditsRemaining === 0;

  let expectedGraduationTerm: string | null = null;
  const pace = CREDITS_PER_TERM[program.level];
  const allTerms = [...completed.map((c) => c.term), ...planned.map((c) => c.term)];
  if (pace !== null && allTerms.length > 0) {
    const lastTerm = allTerms.sort((a, b) => termToSortKey(b) - termToSortKey(a))[0];
    if (totalCreditsRemaining <= 0) {
      expectedGraduationTerm = termDescription(lastTerm);
    } else {
      const termsNeeded = Math.ceil(totalCreditsRemaining / pace);
      let term = lastTerm;
      for (let i = 0; i < termsNeeded; i++) term = nextTerm(term);
      expectedGraduationTerm = termDescription(term);
    }
  }

  return {
    program,
    totalCreditsRequired: program.totalCredits,
    totalCreditsCompleted,
    totalCreditsPlanned,
    totalCreditsRemaining,
    root,
    missing,
    expectedGraduationTerm,
    onTrack,
  };
}
