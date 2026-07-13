import { PROGRAMS } from "@/data/programs";
import type { RequirementNode } from "@/lib/program-schema";

export interface CatalogCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
}

function collectCourses(node: RequirementNode, seen: Map<string, CatalogCourse>): void {
  if (node.type === "course") {
    const key = `${node.subject} ${node.number}`;
    if (!seen.has(key)) {
      seen.set(key, { subject: node.subject, courseNumber: node.number, title: node.title, credits: node.credits });
    }
    return;
  }
  if (node.type === "range") return;
  for (const child of node.children) collectCourses(child, seen);
}

function buildCatalog(): CatalogCourse[] {
  const seen = new Map<string, CatalogCourse>();
  for (const program of Object.values(PROGRAMS)) {
    collectCourses(program.requirements, seen);
  }
  return [...seen.values()];
}

export const STATIC_CATALOG: CatalogCourse[] = buildCatalog();

const CODE_RE = /^([A-Za-z]{2,4})\s*(\d{4}[A-Za-z]?)$/;

export function parseCourseCode(query: string): { subject: string; courseNumber: string } | null {
  const m = query.trim().match(CODE_RE);
  if (!m) return null;
  return { subject: m[1].toUpperCase(), courseNumber: m[2].toUpperCase() };
}

export function searchCatalog(query: string, limit = 8): CatalogCourse[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const codeQ = q.replace(/\s+/g, "");
  const tokens = q.split(/\s+/);
  const codeMatches: CatalogCourse[] = [];
  const titleMatches: CatalogCourse[] = [];
  for (const c of STATIC_CATALOG) {
    const code = `${c.subject}${c.courseNumber}`.toLowerCase();
    if (code.includes(codeQ)) codeMatches.push(c);
    else if (tokens.every((t) => c.title.toLowerCase().includes(t))) titleMatches.push(c);
  }
  return [...codeMatches, ...titleMatches].slice(0, limit);
}
