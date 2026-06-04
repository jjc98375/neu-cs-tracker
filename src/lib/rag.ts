// src/lib/rag.ts
import type { Category } from "@/lib/rag-categories";
import { getOpenAI } from "@/lib/rag-clients";
import { AVAILABLE_CATEGORIES, CATEGORY_KEYS, isCategory } from "@/lib/rag-categories";

export interface RetrievedChunk {
  content: string;
  filename: string;
  metadata: Record<string, unknown>;
}

export interface SourceDoc {
  filename: string;
  preview: string;
  metadata: Record<string, unknown>;
}

export interface AssistantAnswer {
  category: Category | "unknown";
  categoryName: string;
  question: string;
  answer: string;
  sources: SourceDoc[];
}

/** Mirrors the RetrievalQA prompt template in rag.py. */
export function buildPrompt(
  categoryLabel: string,
  context: string,
  question: string,
): string {
  return (
    `You are a helpful assistant for Northeastern University international ` +
    `students, specifically answering questions about ${categoryLabel}.\n\n` +
    `Use ALL relevant information from the context. Be specific and ` +
    `comprehensive, include policies, dates, amounts, and procedures when ` +
    `they appear. Synthesize across documents. If the context doesn't ` +
    `cover the question, say so plainly — don't invent details about ` +
    `${categoryLabel}.\n\n` +
    `Context: ${context}\n\n` +
    `Question: ${question}\n\n` +
    `Answer:`
  );
}

/** Dedupe retrieved chunks by filename, keeping a 200-char preview. */
export function dedupeSources(chunks: RetrievedChunk[]): SourceDoc[] {
  const seen = new Set<string>();
  const out: SourceDoc[] = [];
  for (const c of chunks) {
    if (seen.has(c.filename)) continue;
    seen.add(c.filename);
    out.push({
      filename: c.filename,
      preview: c.content.slice(0, 200),
      metadata: c.metadata,
    });
  }
  return out;
}

const CLASSIFIER_MODEL = "gpt-4o-mini";

/** Auto-route a question to one category key, or "unknown" for no filter. */
export async function classifyCategory(question: string): Promise<Category | "unknown"> {
  const list = CATEGORY_KEYS.map((k) => `- ${k}: ${AVAILABLE_CATEGORIES[k]}`).join("\n");
  const completion = await getOpenAI().chat.completions.create({
    model: CLASSIFIER_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content:
          `Classify the student's question into exactly one category key, ` +
          `or "unknown" if none fit.\n\nCategories:\n${list}\n\n` +
          `Question: ${question}\n\n` +
          `Respond with JSON: {"category": "<key or unknown>"}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as { category?: string };
    if (parsed.category && isCategory(parsed.category)) return parsed.category;
  } catch {
    /* fall through to unknown */
  }
  return "unknown";
}
