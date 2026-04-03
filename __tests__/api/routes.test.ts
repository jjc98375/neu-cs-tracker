import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the route handlers directly by mocking their dependencies.
// Each route imports from @/lib/banner-api, so we mock that module.

vi.mock("@/lib/banner-api", () => ({
  getTerms: vi.fn(),
  bannerGetSubjects: vi.fn(),
  getCampuses: vi.fn(),
  searchCourses: vi.fn(),
  deriveSummerSession: vi.fn(),
  isSummerTerm: vi.fn(),
  termLabel: vi.fn(),
  getPartsOfTerm: vi.fn(),
}));

import * as bannerApi from "@/lib/banner-api";
import { GET as termsGET } from "@/app/api/terms/route";
import { GET as subjectsGET } from "@/app/api/subjects/route";
import { GET as campusesGET } from "@/app/api/campuses/route";
import { GET as coursesGET } from "@/app/api/courses/route";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeRequest(url: string): Request {
  return new Request(url);
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/terms
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/terms", () => {
  it("returns terms array on success", async () => {
    vi.mocked(bannerApi.getTerms).mockResolvedValue([
      { code: "202430", description: "Fall 2024 Semester" },
    ]);
    const res = await termsGET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([{ code: "202430", description: "Fall 2024 Semester" }]);
  });

  it("returns 500 with error message when Banner fails", async () => {
    vi.mocked(bannerApi.getTerms).mockRejectedValue(new Error("Banner timeout"));
    const res = await termsGET();
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Banner timeout");
  });

  it("returns 500 with string error for non-Error throws", async () => {
    vi.mocked(bannerApi.getTerms).mockRejectedValue("network error");
    const res = await termsGET();
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("network error");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/subjects
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/subjects", () => {
  it("returns subjects for a valid term", async () => {
    vi.mocked(bannerApi.bannerGetSubjects).mockResolvedValue([
      { code: "CS", description: "Computer Science" },
    ]);
    const req = makeRequest("http://localhost/api/subjects?term=202430");
    const res = await subjectsGET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([{ code: "CS", description: "Computer Science" }]);
    expect(vi.mocked(bannerApi.bannerGetSubjects)).toHaveBeenCalledWith("202430");
  });

  it("returns 400 when term is missing", async () => {
    const req = makeRequest("http://localhost/api/subjects");
    const res = await subjectsGET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("term is required");
  });

  it("returns 500 when Banner fails", async () => {
    vi.mocked(bannerApi.bannerGetSubjects).mockRejectedValue(new Error("timeout"));
    const req = makeRequest("http://localhost/api/subjects?term=202430");
    const res = await subjectsGET(req);
    expect(res.status).toBe(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/campuses
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/campuses", () => {
  it("returns campuses for a valid term", async () => {
    vi.mocked(bannerApi.getCampuses).mockResolvedValue([
      { code: "BOS", description: "Boston/Burlington" },
    ]);
    const req = makeRequest("http://localhost/api/campuses?term=202430");
    const res = await campusesGET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([{ code: "BOS", description: "Boston/Burlington" }]);
    expect(vi.mocked(bannerApi.getCampuses)).toHaveBeenCalledWith("202430");
  });

  it("returns 400 when term is missing", async () => {
    const req = makeRequest("http://localhost/api/campuses");
    const res = await campusesGET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("term is required");
  });

  it("returns 500 when Banner fails", async () => {
    vi.mocked(bannerApi.getCampuses).mockRejectedValue(new Error("unreachable"));
    const req = makeRequest("http://localhost/api/campuses?term=202430");
    const res = await campusesGET(req);
    expect(res.status).toBe(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/courses
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/courses", () => {
  const mockResult = {
    totalCount: 1,
    data: [],
    pageOffset: 0,
    pageMaxSize: 500,
    sectionsFetchedCount: 0,
    pathMode: "",
    searchResultsConfigs: [],
  };

  it("returns course search results on success", async () => {
    vi.mocked(bannerApi.searchCourses).mockResolvedValue(mockResult);
    const req = makeRequest("http://localhost/api/courses?term=202430");
    const res = await coursesGET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.totalCount).toBe(1);
  });

  it("returns 400 when term is missing", async () => {
    const req = makeRequest("http://localhost/api/courses");
    const res = await coursesGET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("term is required");
  });

  it("passes all optional params to searchCourses", async () => {
    vi.mocked(bannerApi.searchCourses).mockResolvedValue(mockResult);
    const req = makeRequest(
      "http://localhost/api/courses?term=202430&subject=CS&courseNumber=5800&campus=BOS&pageOffset=10&pageMaxSize=20"
    );
    await coursesGET(req);
    expect(vi.mocked(bannerApi.searchCourses)).toHaveBeenCalledWith({
      term: "202430",
      subject: "CS",
      courseNumber: "5800",
      campus: "BOS",
      pageOffset: 10,
      pageMaxSize: 20,
    });
  });

  it("uses default pageOffset=0 and pageMaxSize=500 when not specified", async () => {
    vi.mocked(bannerApi.searchCourses).mockResolvedValue(mockResult);
    const req = makeRequest("http://localhost/api/courses?term=202430");
    await coursesGET(req);
    expect(vi.mocked(bannerApi.searchCourses)).toHaveBeenCalledWith(
      expect.objectContaining({ pageOffset: 0, pageMaxSize: 500 })
    );
  });

  it("returns 500 when searchCourses throws", async () => {
    vi.mocked(bannerApi.searchCourses).mockRejectedValue(new Error("Banner error"));
    const req = makeRequest("http://localhost/api/courses?term=202430");
    const res = await coursesGET(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Banner error");
  });

  it("passes undefined for absent optional params", async () => {
    vi.mocked(bannerApi.searchCourses).mockResolvedValue(mockResult);
    const req = makeRequest("http://localhost/api/courses?term=202430");
    await coursesGET(req);
    expect(vi.mocked(bannerApi.searchCourses)).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: undefined,
        courseNumber: undefined,
        campus: undefined,
      })
    );
  });
});
