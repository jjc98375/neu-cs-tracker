import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

interface SearchResult {
  totalCount: number;
  data: {
    term: string;
    subject: string;
    courseNumber: string;
    courseTitle: string;
    summerSession: string;
    courseReferenceNumber: string;
  }[];
}

describe("[integration] Term switching — simulates UI flow", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("switching from fall to summer returns different courses with correct term codes", async () => {
    const fall = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    expect(fall.status).toBe(200);
    expect(fall.data.data.length).toBeGreaterThan(0);

    const summer = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    expect(summer.status).toBe(200);
    expect(summer.data.data.length).toBeGreaterThan(0);

    for (const section of summer.data.data) {
      expect(section.term).toBe(TEST_TERMS.summerFull2026);
      expect(section.term).not.toBe(TEST_TERMS.fall2025);
    }

    for (const section of fall.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
  });

  it("switching from summer to fall2026 returns different courses", async () => {
    const summer = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    const fall2026 = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2026}&subject=CS`
    );

    expect(summer.data.data.length).toBeGreaterThan(0);
    expect(fall2026.data.data.length).toBeGreaterThan(0);

    for (const section of fall2026.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2026);
    }

    const summerCRNs = new Set(summer.data.data.map((s) => s.courseReferenceNumber));
    const fall2026CRNs = new Set(fall2026.data.data.map((s) => s.courseReferenceNumber));
    const overlap = [...summerCRNs].filter((crn) => fall2026CRNs.has(crn));
    expect(overlap.length).toBeLessThan(summerCRNs.size);
  });

  it("rapid sequential term switches all return correct data", async () => {
    const [fall, fall2026, summer] = await Promise.all([
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`),
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.fall2026}&subject=CS`),
      apiGet<SearchResult>(`/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`),
    ]);

    for (const section of fall.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
    for (const section of fall2026.data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2026);
    }
    for (const section of summer.data.data) {
      expect(section.term).toBe(TEST_TERMS.summerFull2026);
    }
  });

  it("subjects reload correctly after term switch", async () => {
    const fallSubjects = await apiGet<{ code: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    const summerSubjects = await apiGet<{ code: string }[]>(
      `/api/subjects?term=${TEST_TERMS.summerFull2026}`
    );

    expect(fallSubjects.data.length).toBeGreaterThan(0);
    expect(summerSubjects.data.length).toBeGreaterThan(0);

    expect(fallSubjects.data.some((s) => s.code === "CS")).toBe(true);
    expect(summerSubjects.data.some((s) => s.code === "CS")).toBe(true);
  });

  it("campuses reload correctly after term switch", async () => {
    const fallCampuses = await apiGet<{ code: string }[]>(
      `/api/campuses?term=${TEST_TERMS.fall2025}`
    );
    const summerCampuses = await apiGet<{ code: string }[]>(
      `/api/campuses?term=${TEST_TERMS.summerFull2026}`
    );

    expect(fallCampuses.data.length).toBeGreaterThan(0);
    expect(summerCampuses.data.length).toBeGreaterThan(0);
  });
});
