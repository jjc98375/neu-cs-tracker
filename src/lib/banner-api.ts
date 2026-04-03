/**
 * Server-side Banner API client for NUBanner (Ellucian Banner 9 SSB).
 * All requests must go through Next.js API routes to avoid CORS issues.
 */

import type { Term, SearchResult, CourseSection, MeetingTime, SummerSession } from "./types";

const BASE = "https://nubanner.neu.edu/StudentRegistrationSsb/ssb";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Infer summer session from meeting time date ranges.
 * Summer 1 sections end before July; Summer 2 sections start after mid-June.
 * Sections spanning both are Full.
 */
function inferSessionFromDates(
  meetingTimes: { meetingTime: MeetingTime }[]
): SummerSession | null {
  // Find the earliest start and latest end across all meeting times
  let earliest: Date | null = null;
  let latest: Date | null = null;
  for (const mf of meetingTimes) {
    const mt = mf.meetingTime;
    if (mt.startDate) {
      const d = new Date(mt.startDate);
      if (!earliest || d < earliest) earliest = d;
    }
    if (mt.endDate) {
      const d = new Date(mt.endDate);
      if (!latest || d > latest) latest = d;
    }
  }
  if (!earliest || !latest) return null;

  // Duration in days
  const durationDays = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);

  // Summer 1 typically ends by late June (~7 weeks), Summer 2 starts late June (~7 weeks)
  // Full summer spans ~15 weeks (May to August)
  // Use duration + end month to distinguish:
  // - Short duration (< 60 days) ending before July → Summer 1
  // - Short duration (< 60 days) starting after June 20 → Summer 2
  // - Long duration (>= 60 days) → Full
  if (durationDays >= 60) return "Full";
  if (latest.getMonth() < 6) return "Summer1"; // ends before July (month 6 = July)
  if (latest.getMonth() === 6 && latest.getDate() <= 5) return "Summer1"; // ends early July at latest
  if (earliest.getMonth() >= 5 && earliest.getDate() >= 20) return "Summer2"; // starts late June or later
  if (earliest.getMonth() >= 6) return "Summer2"; // starts in July or later
  return null;
}

/** Derive summer session from term code suffix + partOfTerm field + meeting time dates */
export function deriveSummerSession(
  termCode: string,
  partOfTerm: string,
  meetingTimes?: { meetingTime: MeetingTime }[]
): SummerSession {
  const suffix = termCode.slice(-2);
  // Term-level determination
  if (suffix === "40") return "Summer1";
  if (suffix === "60") return "Summer2";
  if (suffix === "50") {
    // Section-level split via partOfTerm
    if (partOfTerm === "A") return "Summer1";
    if (partOfTerm === "B") return "Summer2";
    // Fallback: use meeting time date ranges to detect session
    if (meetingTimes && meetingTimes.length > 0) {
      const inferred = inferSessionFromDates(meetingTimes);
      if (inferred) return inferred;
    }
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

/** Extract all cookies from a response as a single Cookie header string. */
function extractCookies(res: Response): string {
  // getSetCookie() correctly handles multiple Set-Cookie headers,
  // unlike parsing the merged set-cookie header which drops cookies.
  return res.headers.getSetCookie().map((c) => c.split(";")[0].trim()).join("; ");
}

/** Establish a Banner session for the given term and return session cookies. */
async function establishSession(term: string): Promise<string> {
  const res = await bannerPost(
    "/term/search",
    `term=${term}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=`
  );
  return extractCookies(res);
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

export async function bannerGetSubjects(termCode: string) {
  const res = await bannerGet(
    `/classSearch/get_subject?searchTerm=&term=${termCode}&offset=1&max=200`
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
 * Fetch course description from Banner catalog.
 * Banner returns HTML (not JSON), so we parse the text content.
 */
export async function getCourseDescription(
  crn: string,
  term: string
): Promise<string | null> {
  const cookies = await establishSession(term);
  const res = await bannerGet(
    `/courseSearchResults/getCourseDescription?term=${term}&courseReferenceNumber=${crn}`,
    { cookieJar: cookies }
  );
  const html = await res.text();
  // Strip HTML tags to get plain text description
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.toLowerCase().includes("no course description is available")) {
    return null;
  }
  return text;
}

/**
 * Fetch faculty and meeting times for a specific section.
 * The search endpoint doesn't return faculty — this separate call does.
 */
export async function getFacultyMeetingTimes(
  crn: string,
  term: string
): Promise<{ displayName: string; primaryIndicator: boolean }[]> {
  const cookies = await establishSession(term);
  const res = await bannerGet(
    `/searchResults/getFacultyMeetingTimes?term=${term}&courseReferenceNumber=${crn}`,
    { cookieJar: cookies }
  );
  const data = await res.json();
  const faculty: { displayName: string; primaryIndicator: boolean }[] = [];
  const seen = new Set<string>();
  for (const fmt of data?.fmt ?? []) {
    for (const f of fmt?.faculty ?? []) {
      if (f.displayName && !seen.has(f.displayName)) {
        seen.add(f.displayName);
        faculty.push({ displayName: f.displayName, primaryIndicator: f.primaryIndicator });
      }
    }
  }
  return faculty;
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
  const cookies = await establishSession(params.term);

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

  raw.data = (raw.data ?? []).map((s: CourseSection) => ({
    ...s,
    summerSession: deriveSummerSession(s.term, s.partOfTerm, s.meetingsFaculty),
  }));

  return raw;
}
