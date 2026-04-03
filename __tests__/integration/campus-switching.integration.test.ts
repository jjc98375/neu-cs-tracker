import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

interface CourseSection {
  courseReferenceNumber: string;
  term: string;
  subject: string;
  courseNumber: string;
  courseTitle: string;
  campusDescription: string;
}

interface SearchResult {
  totalCount: number;
  data: CourseSection[];
}

// Campuses known to have CS courses for Fall 2026 on Banner
const CAMPUSES_WITH_CS = [
  { code: "SEA", name: "Seattle, WA" },
  { code: "SJO", name: "Silicon Valley, CA" },
  { code: "VAN", name: "Vancouver, Canada" },
  { code: "BOS", name: "Boston" },
  { code: "OAK", name: "Oakland, CA" },
];

describe("[integration] Campus switching — verifies each campus returns correct courses", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  for (const campus of CAMPUSES_WITH_CS) {
    it(`returns CS courses for ${campus.name} (${campus.code})`, async () => {
      const { status, data } = await apiGet<SearchResult>(
        `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=${campus.code}`
      );
      expect(status).toBe(200);
      expect(data.totalCount).toBeGreaterThan(0);
      expect(data.data.length).toBeGreaterThan(0);

      // Every returned course should have the correct campus
      for (const section of data.data) {
        expect(section.campusDescription).toBe(campus.name);
      }
    });
  }

  it("sequential campus switches all return non-zero results", async () => {
    for (const campus of CAMPUSES_WITH_CS) {
      const { data } = await apiGet<SearchResult>(
        `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=${campus.code}`
      );
      expect(data.totalCount).toBeGreaterThan(0);
    }
  });

  it("rapid parallel campus requests all return correct data", async () => {
    const results = await Promise.all(
      CAMPUSES_WITH_CS.map((c) =>
        apiGet<SearchResult>(
          `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=${c.code}`
        ).then((r) => ({ campus: c, ...r }))
      )
    );

    for (const r of results) {
      expect(r.data.totalCount).toBeGreaterThan(0);
      for (const section of r.data.data) {
        expect(section.campusDescription).toBe(r.campus.name);
      }
    }
  });

  it("switching campus within same term returns different CRNs", async () => {
    const sea = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=SEA`
    );
    const bos = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=BOS`
    );

    expect(sea.data.totalCount).toBeGreaterThan(0);
    expect(bos.data.totalCount).toBeGreaterThan(0);

    const seaCRNs = new Set(sea.data.data.map((s) => s.courseReferenceNumber));
    const bosCRNs = new Set(bos.data.data.map((s) => s.courseReferenceNumber));

    // CRNs should be completely different between campuses
    const overlap = [...seaCRNs].filter((crn) => bosCRNs.has(crn));
    expect(overlap.length).toBe(0);
  });

  it("all campuses filter returns empty for campus with no CS courses", async () => {
    // Charlotte has no CS courses for this term
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=CHL`
    );
    expect(data.totalCount).toBe(0);
    expect(data.data.length).toBe(0);
  });

  it("campus filter combined with course number range works", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS&campus=SEA`
    );
    expect(data.totalCount).toBeGreaterThan(0);

    // Verify we can find grad-level courses (5000+)
    const gradCourses = data.data.filter(
      (c) => parseInt(c.courseNumber, 10) >= 5000
    );
    expect(gradCourses.length).toBeGreaterThan(0);
  });
});
