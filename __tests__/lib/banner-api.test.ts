import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deriveSummerSession,
  isSummerTerm,
  termLabel,
  getTerms,
  searchCourses,
} from "@/lib/banner-api";

// ──────────────────────────────────────────────────────────────────────────────
// deriveSummerSession
// ──────────────────────────────────────────────────────────────────────────────

describe("deriveSummerSession", () => {
  it("returns Summer1 for suffix 40", () => {
    expect(deriveSummerSession("202440", "1")).toBe("Summer1");
  });

  it("returns Summer2 for suffix 60", () => {
    expect(deriveSummerSession("202460", "1")).toBe("Summer2");
  });

  it("returns Summer1 for suffix 50 with partOfTerm A", () => {
    expect(deriveSummerSession("202450", "A")).toBe("Summer1");
  });

  it("returns Summer2 for suffix 50 with partOfTerm B", () => {
    expect(deriveSummerSession("202450", "B")).toBe("Summer2");
  });

  it("returns Full for suffix 50 with partOfTerm 1", () => {
    expect(deriveSummerSession("202450", "1")).toBe("Full");
  });

  it("returns Full for suffix 50 with empty partOfTerm", () => {
    expect(deriveSummerSession("202450", "")).toBe("Full");
  });

  it("returns N/A for spring term (suffix 10)", () => {
    expect(deriveSummerSession("202410", "1")).toBe("N/A");
  });

  it("returns N/A for fall term (suffix 30)", () => {
    expect(deriveSummerSession("202430", "1")).toBe("N/A");
  });

  it("returns N/A for unknown suffix", () => {
    expect(deriveSummerSession("202499", "1")).toBe("N/A");
  });

  // Date-based fallback tests for suffix 50 with ambiguous partOfTerm
  const makeMeeting = (start: string, end: string) => [{
    meetingTime: {
      beginTime: null, endTime: null, building: null, buildingDescription: null,
      campus: null, campusDescription: null, room: null,
      startDate: start, endDate: end,
      monday: false, tuesday: false, wednesday: false, thursday: false,
      friday: false, saturday: false, sunday: false,
      meetingScheduleType: null, meetingType: null, meetingTypeDescription: null,
    },
    faculty: [],
  }];

  it("infers Summer1 from dates ending in June (suffix 50, partOfTerm 1)", () => {
    expect(deriveSummerSession("202650", "1", makeMeeting("05/06/2026", "06/21/2026"))).toBe("Summer1");
  });

  it("infers Summer2 from dates starting late June (suffix 50, partOfTerm 1)", () => {
    expect(deriveSummerSession("202650", "1", makeMeeting("06/29/2026", "08/16/2026"))).toBe("Summer2");
  });

  it("infers Full from dates spanning full summer (suffix 50, partOfTerm 1)", () => {
    expect(deriveSummerSession("202650", "1", makeMeeting("05/06/2026", "08/16/2026"))).toBe("Full");
  });

  it("partOfTerm A/B takes precedence over dates", () => {
    // Even with full-summer dates, partOfTerm A means Summer1
    expect(deriveSummerSession("202650", "A", makeMeeting("05/06/2026", "08/16/2026"))).toBe("Summer1");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isSummerTerm
// ──────────────────────────────────────────────────────────────────────────────

describe("isSummerTerm", () => {
  it("returns true for suffix 40 (Summer 1)", () => {
    expect(isSummerTerm("202440")).toBe(true);
  });

  it("returns true for suffix 50 (Summer Full)", () => {
    expect(isSummerTerm("202450")).toBe(true);
  });

  it("returns true for suffix 54 (Summer CPS)", () => {
    expect(isSummerTerm("202454")).toBe(true);
  });

  it("returns true for suffix 55 (Summer CPS Quarter)", () => {
    expect(isSummerTerm("202455")).toBe(true);
  });

  it("returns true for suffix 60 (Summer 2)", () => {
    expect(isSummerTerm("202460")).toBe(true);
  });

  it("returns false for spring term (suffix 10)", () => {
    expect(isSummerTerm("202410")).toBe(false);
  });

  it("returns false for fall term (suffix 30)", () => {
    expect(isSummerTerm("202430")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// termLabel
// ──────────────────────────────────────────────────────────────────────────────

describe("termLabel", () => {
  it("returns 'Spring 2024' for 202410", () => {
    expect(termLabel("202410")).toBe("Spring 2024");
  });

  it("returns 'Fall 2024' for 202430", () => {
    expect(termLabel("202430")).toBe("Fall 2024");
  });

  it("returns 'Summer 1 2024' for 202440", () => {
    expect(termLabel("202440")).toBe("Summer 1 2024");
  });

  it("returns 'Summer Full 2024' for 202450", () => {
    expect(termLabel("202450")).toBe("Summer Full 2024");
  });

  it("returns 'Summer CPS 2024' for 202454", () => {
    expect(termLabel("202454")).toBe("Summer CPS 2024");
  });

  it("returns 'Summer CPS Quarter 2024' for 202455", () => {
    expect(termLabel("202455")).toBe("Summer CPS Quarter 2024");
  });

  it("returns 'Summer 2 2024' for 202460", () => {
    expect(termLabel("202460")).toBe("Summer 2 2024");
  });

  it("falls back to suffix for unknown codes", () => {
    expect(termLabel("202499")).toBe("99 2024");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getTerms (mocked fetch)
// ──────────────────────────────────────────────────────────────────────────────

describe("getTerms", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and maps terms from Banner", async () => {
    const mockData = [
      { code: "202430", description: "Fall 2024 Semester" },
      { code: "202410", description: "Spring 2024 Semester" },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await getTerms(50);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ code: "202430", description: "Fall 2024 Semester" });
    expect(result[1]).toEqual({ code: "202410", description: "Spring 2024 Semester" });
  });

  it("throws when Banner returns non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(getTerms()).rejects.toThrow("503");
  });

  it("passes max parameter in URL", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await getTerms(10);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("max=10"),
      expect.any(Object)
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// searchCourses (mocked fetch)
// ──────────────────────────────────────────────────────────────────────────────

describe("searchCourses", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockSection = {
    courseReferenceNumber: "12345",
    term: "202450",
    termDesc: "Summer Full 2024",
    partOfTerm: "A",
    subject: "CS",
    subjectDescription: "Computer Science",
    courseNumber: "5800",
    sequenceNumber: "01",
    courseTitle: "Algorithms",
    subjectCourse: "CS5800",
    campusDescription: "Boston/Burlington",
    scheduleTypeDescription: "Lecture",
    creditHours: 4,
    creditHourHigh: null,
    creditHourLow: null,
    maximumEnrollment: 30,
    enrollment: 20,
    seatsAvailable: 10,
    waitCapacity: 5,
    waitCount: 0,
    waitAvailable: 5,
    openSection: true,
    faculty: [],
    meetingsFaculty: [],
    sectionAttributes: [],
    summerSession: "N/A", // will be overwritten
  };

  it("annotates sections with derived summerSession", async () => {
    const mockSessionRes = {
      ok: true,
      headers: { getSetCookie: () => ["SESSID=abc; Path=/", "JSESSIONID=xyz; Path=/"] },
    };
    const mockSearchRes = {
      ok: true,
      json: async () => ({
        totalCount: 1,
        data: [mockSection],
        pageOffset: 0,
        pageMaxSize: 500,
        sectionsFetchedCount: 1,
        pathMode: "",
        searchResultsConfigs: [],
      }),
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockSessionRes as unknown as Response)
      .mockResolvedValueOnce(mockSearchRes as unknown as Response);

    const result = await searchCourses({ term: "202450" });
    // partOfTerm "A" in a "50" term → Summer1
    expect(result.data[0].summerSession).toBe("Summer1");
  });

  it("handles empty data array", async () => {
    const mockSessionRes = {
      ok: true,
      headers: { getSetCookie: () => [] },
    };
    const mockSearchRes = {
      ok: true,
      json: async () => ({
        totalCount: 0,
        data: [],
        pageOffset: 0,
        pageMaxSize: 500,
        sectionsFetchedCount: 0,
        pathMode: "",
        searchResultsConfigs: [],
      }),
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockSessionRes as unknown as Response)
      .mockResolvedValueOnce(mockSearchRes as unknown as Response);

    const result = await searchCourses({ term: "202430" });
    expect(result.data).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it("passes subject and courseNumber to query string", async () => {
    const mockSessionRes = {
      ok: true,
      headers: { getSetCookie: () => [] },
    };
    const mockSearchRes = {
      ok: true,
      json: async () => ({ totalCount: 1, data: [{ term: "202430", partOfTerm: "1", meetingsFaculty: [] }], pageOffset: 0, pageMaxSize: 500, sectionsFetchedCount: 1, pathMode: "", searchResultsConfigs: [] }),
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockSessionRes as unknown as Response)
      .mockResolvedValueOnce(mockSearchRes as unknown as Response);

    await searchCourses({ term: "202430", subject: "CS", courseNumber: "5800" });

    const secondCall = vi.mocked(fetch).mock.calls[1][0] as string;
    expect(secondCall).toContain("txt_subject=CS");
    expect(secondCall).toContain("txt_courseNumber=5800");
  });

  it("throws when session POST fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(searchCourses({ term: "202430" })).rejects.toThrow("500");
  });
});
