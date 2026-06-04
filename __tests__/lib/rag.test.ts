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

import { getQdrant } from "@/lib/rag-clients";
import { retrieve } from "@/lib/rag";

function mockEmbeddings(vector: number[]) {
  const createEmb = vi.fn().mockResolvedValue({ data: [{ embedding: vector }] });
  const createChat = vi.fn();
  vi.mocked(getOpenAI).mockReturnValue({
    embeddings: { create: createEmb },
    chat: { completions: { create: createChat } },
  } as unknown as ReturnType<typeof getOpenAI>);
  return createEmb;
}

describe("retrieve", () => {
  it("applies a metadata.category filter and maps payloads", async () => {
    mockEmbeddings([0.1, 0.2, 0.3]);
    const search = vi.fn().mockResolvedValue([
      { payload: { page_content: "F-1 info", metadata: { filename: "f1.pdf", category: "visa" } } },
    ]);
    vi.mocked(getQdrant).mockReturnValue({ search } as unknown as ReturnType<typeof getQdrant>);

    const chunks = await retrieve("visa question", "visa");

    expect(search).toHaveBeenCalledWith("test_collection", expect.objectContaining({
      limit: 6,
      with_payload: true,
      filter: { must: [{ key: "metadata.category", match: { value: "visa" } }] },
    }));
    expect(chunks).toEqual([
      { content: "F-1 info", filename: "f1.pdf", metadata: { filename: "f1.pdf", category: "visa" } },
    ]);
  });

  it("omits the filter when category is 'unknown'", async () => {
    mockEmbeddings([0.1]);
    const search = vi.fn().mockResolvedValue([]);
    vi.mocked(getQdrant).mockReturnValue({ search } as unknown as ReturnType<typeof getQdrant>);

    await retrieve("anything", "unknown");

    expect(search).toHaveBeenCalledWith("test_collection", expect.objectContaining({ filter: undefined }));
  });

  it("defaults missing payload fields safely", async () => {
    mockEmbeddings([0.1]);
    const search = vi.fn().mockResolvedValue([{ payload: {} }]);
    vi.mocked(getQdrant).mockReturnValue({ search } as unknown as ReturnType<typeof getQdrant>);

    const chunks = await retrieve("q", "visa");
    expect(chunks[0]).toEqual({ content: "", filename: "Unknown", metadata: {} });
  });
});

import { answerQuestion } from "@/lib/rag";

describe("answerQuestion", () => {
  function mockFull(opts: { classify?: string; answer: string; chunks: unknown[] }) {
    const chat = vi.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ category: opts.classify }) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: opts.answer } }] });
    // when category is explicit, only the answer call happens — make create return answer by default too
    const chatExplicit = vi.fn().mockResolvedValue({ choices: [{ message: { content: opts.answer } }] });
    vi.mocked(getOpenAI).mockReturnValue({
      embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: [0.1] }] }) },
      chat: { completions: { create: opts.classify ? chat : chatExplicit } },
    } as unknown as ReturnType<typeof getOpenAI>);
    vi.mocked(getQdrant).mockReturnValue({
      search: vi.fn().mockResolvedValue(opts.chunks),
    } as unknown as ReturnType<typeof getQdrant>);
  }

  it("auto-classifies when no category is given", async () => {
    mockFull({
      classify: "visa",
      answer: "You need an I-20.",
      chunks: [{ payload: { page_content: "I-20 details", metadata: { filename: "i20.pdf", category: "visa" } } }],
    });
    const out = await answerQuestion("F-1 docs?");
    expect(out.category).toBe("visa");
    expect(out.categoryName).toBe("Visa");
    expect(out.answer).toBe("You need an I-20.");
    expect(out.sources).toEqual([
      { filename: "i20.pdf", preview: "I-20 details", metadata: { filename: "i20.pdf", category: "visa" } },
    ]);
  });

  it("uses the explicit category and skips classification", async () => {
    mockFull({ answer: "Billing answer.", chunks: [] });
    const out = await answerQuestion("How do I pay?", "billing");
    expect(out.category).toBe("billing");
    expect(out.categoryName).toBe("Billing");
    expect(out.answer).toBe("Billing answer.");
  });

  it("reports 'All categories' when classification is unknown", async () => {
    mockFull({ classify: "weather", answer: "I'm not sure.", chunks: [] });
    const out = await answerQuestion("random");
    expect(out.category).toBe("unknown");
    expect(out.categoryName).toBe("All categories");
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
