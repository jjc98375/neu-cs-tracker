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

/**
 * Recursively sum credits already claimed (pass 1) by all course-type leaves
 * in the given subtree. Used to pre-subtract exact-course claims from a
 * chooseCredits budget before the range pass runs.
 */
function pass1ClaimedCredits(node: RequirementNode, leafMatches: Map<RequirementNode, CourseMatch[]>): number {
  if (node.type === "course") {
    return (leafMatches.get(node) ?? []).reduce((s, m) => s + m.credits, 0);
  }
  if (node.type === "range") return 0;
  return node.children.reduce((s, c) => s + pass1ClaimedCredits(c, leafMatches), 0);
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

// analyzeGraduation and term helpers are added in the next task.
export type { ProgramV2 };
