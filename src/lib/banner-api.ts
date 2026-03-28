/**
 * Server-side Banner API client for NUBanner (Ellucian Banner 9 SSB).
 * All requests must go through Next.js API routes to avoid CORS issues.
 */

import type { Term, SearchResult, CourseSection, SummerSession } from "./types";

const BASE = "https://nubanner.neu.edu/StudentRegistrationSsb/ssb";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Derive summer session from term code suffix + partOfTerm field */
export function deriveSummerSession(
  termCode: string,
  partOfTerm: string
): SummerSession {
  const suffix = termCode.slice(-2);
  // Term-level determination
  if (suffix === "40") return "Summer1";
  if (suffix === "60") return "Summer2";
  if (suffix === "50") {
    // Full summer term — section-level split
    if (partOfTerm === "A") return "Summer1";
    if (partOfTerm === "B") return "Summer2";
    if (partOfTerm === "1" || partOfTerm === "") return "Full";
    return "Full";
  }
  return "N/A";
}

/** Returns true if a term code represents any summer session */
export function isSummerTerm(termCode: string): boolean {
  const suffix = termCode.slice(-2);
  return ["40", "50", "54", "55", "60"].includes(suffix);
}

/** Human-readable label for a term code */
export function termLabel(termCode: string): string {
  const year = termCode.slice(0, 4);
  const suffix = termCode.slice(-2);
  const map: Record<string, string> = {
    "10": "Spring",
    "30": "Fall",
    "40": "Summer 1",
    "50": "Summer Full",
    "54": "Summer CPS",
    "55": "Summer CPS Quarter",
    "60": "Summer 2",
  };
  return `${map[suffix] ?? suffix} ${year}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Banner API — server-side only (uses fetch with cookies)
// ──────────────────────────────────────────────────────────────────────────────

interface FetchOptions {
  cookieJar?: string;
}

async function bannerGet(path: string, opts?: FetchOptions) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(opts?.cookieJar ? { Cookie: opts.cookieJar } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Banner GET ${path} → ${res.status}`);
  return res;
}

async function bannerPost(path: string, body: string, cookies?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Banner POST ${path} → ${res.status}`);
  return res;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API functions (called from route handlers)
// ──────────────────────────────────────────────────────────────────────────────

export async function getTerms(max = 50): Promise<Term[]> {
  const res = await bannerGet(
    `/classSearch/getTerms?searchTerm=&offset=1&max=${max}`
  );
  const data = await res.json();
  return (data as { code: string; description: string }[]).map((t) => ({
    code: t.code,
    description: t.description,
  }));
}

export async function getCampuses(termCode: string) {
  const res = await bannerGet(
    `/classSearch/get_campus?searchTerm=&term=${termCode}&offset=1&max=100`
  );
  return res.json();
}

export async function getPartsOfTerm(termCode: string) {
  const res = await bannerGet(
    `/classSearch/get_partOfTerm?searchTerm=&term=${termCode}&offset=1&max=50`
  );
  return res.json();
}

/**
 * Full course search. Establishes a session cookie first (required by Banner).
 * Returns annotated CourseSection[] with derived summerSession.
 */
export async function searchCourses(params: {
  term: string;
  subject?: string;
  courseNumber?: string;
  campus?: string;
  pageOffset?: number;
  pageMaxSize?: number;
}): Promise<SearchResult> {
  // Step 1: POST term/search to get session cookies
  const sessionRes = await bannerPost(
    "/term/search",
    `term=${params.term}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=`
  );
  const setCookieHeader = sessionRes.headers.get("set-cookie") ?? "";
  // Parse all cookies
  const cookies = setCookieHeader
    .split(/,(?=[^ ])/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");

  // Step 2: Build search query
  const qs = new URLSearchParams({
    txt_term: params.term,
    pageOffset: String(params.pageOffset ?? 0),
    pageMaxSize: String(params.pageMaxSize ?? 500),
    sortColumn: "subjectDescription",
    sortDirection: "asc",
    startDatepicker: "",
    endDatepicker: "",
  });
  if (params.subject) qs.set("txt_subject", params.subject);
  if (params.courseNumber) qs.set("txt_courseNumber", params.courseNumber);
  if (params.campus) qs.set("txt_campus", params.campus);

  const res = await bannerGet(
    `/searchResults/searchResults?${qs.toString()}`,
    { cookieJar: cookies }
  );
  const raw: SearchResult = await res.json();

  // Annotate each section with derived summer session
  raw.data = (raw.data ?? []).map((s: CourseSection) => ({
    ...s,
    summerSession: deriveSummerSession(s.term, s.partOfTerm),
  }));

  return raw;
}
