import type { CatalogCourse } from "@/lib/course-catalog";

interface Term { code: string; description: string }

let termsPromise: Promise<Term[]> | null = null;

/** Test-only: clear the cached terms promise between cases. */
export function __resetTermCacheForTests() {
  termsPromise = null;
}

async function latestTermCode(): Promise<string | null> {
  if (!termsPromise) {
    termsPromise = fetch("/api/terms").then((r) => (r.ok ? r.json() : []));
  }
  try {
    const terms = await termsPromise;
    return Array.isArray(terms) && terms.length ? terms[0].code : null;
  } catch {
    return null;
  }
}

export async function lookupBannerCourse(subject: string, courseNumber: string): Promise<CatalogCourse | null> {
  try {
    const term = await latestTermCode();
    if (!term) return null;
    const url = `/api/courses?term=${encodeURIComponent(term)}&subject=${encodeURIComponent(subject)}&courseNumber=${encodeURIComponent(courseNumber)}&pageMaxSize=50`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ subject: string; courseNumber: string; courseTitle: string; creditHours: number | null; creditHourHigh: number | null }> };
    const hit = json.data?.find((s) => s.courseNumber === courseNumber) ?? json.data?.[0];
    if (!hit) return null;
    return { subject: hit.subject, courseNumber: hit.courseNumber, title: hit.courseTitle, credits: hit.creditHourHigh ?? hit.creditHours ?? 4 };
  } catch {
    return null;
  }
}
