import { PROGRAMS } from "@/lib/requirements";

export interface CatalogCourse {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number;
}

function buildCatalog(): CatalogCourse[] {
  const seen = new Map<string, CatalogCourse>();
  for (const program of Object.values(PROGRAMS)) {
    for (const req of program.requirements) {
      const key = `${req.subject} ${req.courseNumber}`;
      if (!seen.has(key)) {
        seen.set(key, { subject: req.subject, courseNumber: req.courseNumber, title: req.title, credits: req.credits });
      }
    }
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
