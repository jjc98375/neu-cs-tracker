// __tests__/lib/rag.test.ts
import { describe, it, expect } from "vitest";
import { buildPrompt, dedupeSources } from "@/lib/rag";

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
