import { describe, it, expect, beforeAll } from "vitest";
import { apiGet, waitForServer } from "./helpers";

describe("[integration] GET /api/terms", () => {
  beforeAll(async () => {
    await waitForServer();
  }, 15_000);

  it("returns a non-empty array of terms", async () => {
    const { status, data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each term has code and description", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    for (const term of data) {
      expect(term.code).toMatch(/^\d{6}$/);
      expect(term.description).toBeTruthy();
    }
  });

  it("includes known recent terms", async () => {
    const { data } = await apiGet<{ code: string; description: string }[]>("/api/terms");
    const codes = data.map((t) => t.code);
    expect(codes.some((c) => c.startsWith("2026"))).toBe(true);
  });
});
