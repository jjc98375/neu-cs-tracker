const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

export async function apiGet<T = unknown>(path: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

export const TEST_TERMS = {
  fall2025:       "202530",
  fall2026:       "202710",
  summerFull2026: "202650",
} as const;

export async function waitForServer(timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/terms`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server not reachable at ${BASE_URL} after ${timeoutMs}ms`);
}
