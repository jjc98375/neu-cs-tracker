import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer, TEST_TERMS } from "./helpers";

describe("[integration] GET /api/subjects", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns subjects for a valid term", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("includes CS subject for fall term", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.fall2025}`
    );
    expect(data.some((s) => s.code === "CS")).toBe(true);
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/subjects");
    expect(status).toBe(400);
  });

  it("returns subjects for summer term too", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>(
      `/api/subjects?term=${TEST_TERMS.summerFull2026}`
    );
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe("[integration] GET /api/campuses", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns campuses for a valid term", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>(
      `/api/campuses?term=${TEST_TERMS.fall2025}`
    );
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("returns 400 without term param", async () => {
    const { status } = await apiGet("/api/campuses");
    expect(status).toBe(400);
  });
});
