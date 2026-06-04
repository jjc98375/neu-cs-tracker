// src/lib/rag.ts
import type { Category } from "@/lib/rag-categories";

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
