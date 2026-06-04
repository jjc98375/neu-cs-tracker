// __tests__/lib/rag.test.ts
import { vi } from "vitest";
vi.mock("@/lib/rag-clients", () => ({
  getOpenAI: vi.fn(),
  getQdrant: vi.fn(),
  COLLECTION: "test_collection",
}));
import { getOpenAI } from "@/lib/rag-clients";
import { classifyCategory } from "@/lib/rag";
import { describe, it, expect } from "vitest";
import { buildPrompt, dedupeSources } from "@/lib/rag";

function mockChat(content: string) {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
  });
  vi.mocked(getOpenAI).mockReturnValue({
    chat: { completions: { create } },
  } as unknown as ReturnType<typeof getOpenAI>);
  return create;
}

describe("buildPrompt", () => {
  it("embeds the category label, context, and question", () => {
    const p = buildPrompt("Visa", "ctx text", "Do I need a passport?");
    expect(p).toContain("specifically answering questions about Visa");
    expect(p).toContain("Context: ctx text");
    expect(p).toContain("Question: Do I need a passport?");
    expect(p.trimEnd().endsWith("Answer:")).toBe(true);
  });
});

describe("dedupeSources", () => {
  it("keeps first occurrence per filename and previews 200 chars", () => {
    const long = "x".repeat(250);
    const out = dedupeSources([
      { content: long, filename: "a.pdf", metadata: { category: "visa" } },
      { content: "second a", filename: "a.pdf", metadata: { category: "visa" } },
      { content: "b body", filename: "b.pdf", metadata: { category: "visa" } },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].filename).toBe("a.pdf");
    expect(out[0].preview).toHaveLength(200);
    expect(out[1].filename).toBe("b.pdf");
    expect(out[1].preview).toBe("b body");
  });
});

describe("classifyCategory", () => {
  it("returns the category key when the model picks a valid one", async () => {
    mockChat('{"category":"visa"}');
    expect(await classifyCategory("F-1 questions?")).toBe("visa");
  });

  it("returns 'unknown' when the model returns an invalid key", async () => {
    mockChat('{"category":"weather"}');
    expect(await classifyCategory("Will it rain?")).toBe("unknown");
  });

  it("returns 'unknown' on unparseable output", async () => {
    mockChat("not json");
    expect(await classifyCategory("???")).toBe("unknown");
  });
});
