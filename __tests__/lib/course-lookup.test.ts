import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupBannerCourse, __resetTermCacheForTests } from "@/lib/course-lookup";

beforeEach(() => __resetTermCacheForTests());

function mockFetchSequence(termsJson: unknown, coursesJson: unknown) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => termsJson })
    .mockResolvedValueOnce({ ok: true, json: async () => coursesJson });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lookupBannerCourse", () => {
  it("returns title+credits from the latest term", async () => {
    const fetchMock = mockFetchSequence(
      [{ code: "202650", description: "Summer 2026" }],
      { data: [{ subject: "CS", courseNumber: "6620", subjectCourse: "CS6620", courseTitle: "Reinforcement Learning", creditHours: 4, creditHourHigh: 4 }] }
    );
    const r = await lookupBannerCourse("CS", "6620");
    expect(r).toEqual({ subject: "CS", courseNumber: "6620", title: "Reinforcement Learning", credits: 4 });
    expect(fetchMock.mock.calls[1][0]).toContain("term=202650");
    expect(fetchMock.mock.calls[1][0]).toContain("subject=CS");
    expect(fetchMock.mock.calls[1][0]).toContain("courseNumber=6620");
  });
  it("returns null when no course matches", async () => {
    mockFetchSequence([{ code: "202650", description: "Summer 2026" }], { data: [] });
    expect(await lookupBannerCourse("CS", "9999")).toBeNull();
  });
  it("returns null on fetch error (never throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await lookupBannerCourse("CS", "6620")).toBeNull();
  });
});
