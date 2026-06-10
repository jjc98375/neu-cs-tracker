import { describe, it, expect } from "vitest";
import { STATIC_CATALOG, searchCatalog, parseCourseCode } from "@/lib/course-catalog";

describe("STATIC_CATALOG", () => {
  it("is non-empty and deduped by subject+number", () => {
    expect(STATIC_CATALOG.length).toBeGreaterThan(20);
    const keys = STATIC_CATALOG.map((c) => `${c.subject} ${c.courseNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("includes known courses with titles", () => {
    const ml = STATIC_CATALOG.find((c) => c.subject === "CS" && c.courseNumber === "6140");
    expect(ml?.title).toMatch(/machine learning/i);
  });
});

describe("parseCourseCode", () => {
  it("parses codes with/without space", () => {
    expect(parseCourseCode("CS 6620")).toEqual({ subject: "CS", courseNumber: "6620" });
    expect(parseCourseCode("cs6620")).toEqual({ subject: "CS", courseNumber: "6620" });
  });
  it("returns null for non-codes", () => {
    expect(parseCourseCode("machine learning")).toBeNull();
    expect(parseCourseCode("CS")).toBeNull();
  });
});

describe("searchCatalog", () => {
  it("matches by code, ignoring spacing/case", () => {
    const r = searchCatalog("cs6140");
    expect(r[0]).toMatchObject({ subject: "CS", courseNumber: "6140" });
  });
  it("matches by title tokens", () => {
    const r = searchCatalog("machine learning");
    expect(r.some((c) => c.courseNumber === "6140")).toBe(true);
  });
  it("respects the limit", () => {
    expect(searchCatalog("CS", 3).length).toBeLessThanOrEqual(3);
  });
  it("returns [] for empty query", () => {
    expect(searchCatalog("")).toEqual([]);
  });
});
