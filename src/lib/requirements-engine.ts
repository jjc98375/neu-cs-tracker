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
 * Pass 2: range leaves claim remaining pool entries. `creditBudget` is the
 * enclosing chooseCredits target still unmet (Infinity outside chooseCredits
 * means "claim at most one").
 */
function allocateRanges(
  node: RequirementNode,
  pool: PoolEntry[],
  leafMatches: Map<RequirementNode, CourseMatch[]>,
  creditBudget: { remaining: number } | null
): void {
  if (node.type === "course") return;
  if (node.type === "range") {
    const matches: CourseMatch[] = [];
    if (creditBudget) {
      for (const e of pool) {
        if (creditBudget.remaining <= 0) break;
        if (rangeMatches(node, e)) {
          e.consumed = true;
          creditBudget.remaining -= e.match.credits;
          matches.push(e.match);
        }
      }
    } else {
      const e = pool.find((x) => rangeMatches(node, x));
      if (e) {
        e.consumed = true;
        matches.push(e.match);
      }
    }
    if (matches.length) leafMatches.set(node, matches);
    return;
  }
  if (node.type === "chooseCredits") {
    // Course children were already handled in pass 1; subtract their credits.
    let earned = 0;
    for (const child of node.children) {
      if (child.type === "course") earned += (leafMatches.get(child) ?? []).reduce((s, m) => s + m.credits, 0);
    }
    const budget = { remaining: node.credits - earned };
    for (const child of node.children) allocateRanges(child, pool, leafMatches, budget);
    return;
  }
  for (const child of node.children) allocateRanges(child, pool, leafMatches, null);
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
  allocateRanges(root, pool, leafMatches, null);
  return evaluate(root, leafMatches);
}

// analyzeGraduation and term helpers are added in the next task.
export type { ProgramV2 };
