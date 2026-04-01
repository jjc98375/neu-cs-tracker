import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

interface CourseSection {
  courseReferenceNumber: string;
  term: string;
  subject: string;
  courseNumber: string;
  courseTitle: string;
  summerSession: string;
  partOfTerm: string;
  meetingsFaculty: {
    meetingTime: {
      startDate: string | null;
      endDate: string | null;
    };
  }[];
  seatsAvailable: number;
  maximumEnrollment: number;
  enrollment: number;
}

interface SearchResult {
  totalCount: number;
  data: CourseSection[];
}

describe("[integration] GET /api/courses", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns CS courses for fall term", async () => {
    const { status, data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    expect(status).toBe(200);
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("every returned course belongs to the requested term", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    for (const section of data.data) {
      expect(section.term).toBe(TEST_TERMS.fall2025);
    }
  });

  it("every returned course has the requested subject", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS`
    );
    for (const section of data.data) {
      expect(section.subject).toBe("CS");
    }
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/courses");
    expect(status).toBe(400);
  });

  it("returns courses for summer full term", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("all summer full courses have a valid summerSession value", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    const validSessions = ["Full", "Summer1", "Summer2", "N/A"];
    for (const section of data.data) {
      expect(validSessions).toContain(section.summerSession);
    }
  });

  it("summer courses with short date ranges are NOT all labeled Full", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.summerFull2026}&subject=CS`
    );
    const sessions = data.data.map((s) => s.summerSession);
    const hasSplit = sessions.includes("Summer1") || sessions.includes("Summer2");
    expect(hasSplit).toBe(true);
  });

  it("each section has required enrollment fields", async () => {
    const { data } = await apiGet<SearchResult>(
      `/api/courses?term=${TEST_TERMS.fall2025}&subject=CS&pageMaxSize=10`
    );
    for (const section of data.data) {
      expect(section.courseReferenceNumber).toBeTruthy();
      expect(section.courseTitle).toBeTruthy();
      expect(typeof section.maximumEnrollment).toBe("number");
      expect(typeof section.enrollment).toBe("number");
      expect(typeof section.seatsAvailable).toBe("number");
    }
  });
});
