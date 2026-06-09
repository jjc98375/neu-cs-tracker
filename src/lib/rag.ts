// src/lib/rag.ts
import type { Category } from "@/lib/rag-categories";
import { getOpenAI, getQdrant, COLLECTION } from "@/lib/rag-clients";
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
const ANSWER_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small"; // MUST match ingest.py
const TOP_K = 6;
// If a category-filtered search's best match scores below this cosine floor, the
// classifier likely misrouted the question (e.g. "apply for OPT" → visa scores ~0.43
// while the OPT doc scores ~0.71 unfiltered). Below the floor we retry without the
// filter so a wrong category can't hide an otherwise-strong document.
const SCORE_FLOOR = 0.5;

interface ScoredResult {
  score?: number;
  payload?: { page_content?: string; metadata?: Record<string, unknown> };
}

function buildFilter(category: Category | "unknown") {
  return category === "unknown"
    ? undefined
    : { must: [{ key: "metadata.category", match: { value: category } }] };
}

function mapResults(results: ScoredResult[]): RetrievedChunk[] {
  return results.map((r) => {
    const payload = r.payload ?? {};
    const metadata = payload.metadata ?? {};
    return {
      content: payload.page_content ?? "",
      filename: String(metadata.filename ?? "Unknown"),
      metadata,
    };
  });
}

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
          `Routing guidance for commonly-confused topics:\n` +
          `- Any work authorization — OPT, STEM OPT, CPT, co-op, on-campus jobs, ` +
          `assistantships, employment authorization — goes to "employment", NOT "visa".\n` +
          `- "visa" is for the consular/entry process only: visa interviews, DS-160, ` +
          `consulate appointments, SEVIS fee, port of entry.\n` +
          `- Health insurance / NUSHP, fees, and payments go to "billing" or "tuition".\n\n` +
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

/** Embed the question and run a (optionally category-filtered) similarity search. */
export async function retrieve(
  question: string,
  category: Category | "unknown",
): Promise<RetrievedChunk[]> {
  const emb = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
  });
  const vector = emb.data[0].embedding as number[];

  // LangChain-Qdrant stores each point as { page_content: string, metadata: { filename, category, … } };
  // the dot-path filter key "metadata.category" matches that nested payload (parity with ingestion/ingest.py).
  const filtered = (await getQdrant().search(COLLECTION, {
    vector,
    limit: TOP_K,
    with_payload: true,
    filter: buildFilter(category),
  })) as ScoredResult[];

  // Low-confidence fallback: when a category filter was applied but its best match
  // is weak (or empty), the classifier likely misrouted — retry unfiltered and keep
  // whichever surfaced the stronger top match.
  if (category !== "unknown") {
    const topScore = typeof filtered[0]?.score === "number" ? filtered[0].score : undefined;
    const weak = filtered.length === 0 || (topScore !== undefined && topScore < SCORE_FLOOR);
    if (weak) {
      const unfiltered = (await getQdrant().search(COLLECTION, {
        vector,
        limit: TOP_K,
        with_payload: true,
        filter: undefined,
      })) as ScoredResult[];
      const unfilteredTop =
        typeof unfiltered[0]?.score === "number" ? unfiltered[0].score : undefined;
      const better =
        unfiltered.length > 0 &&
        (topScore === undefined ||
          (unfilteredTop !== undefined && unfilteredTop >= topScore));
      if (better) return mapResults(unfiltered);
    }
  }

  return mapResults(filtered);
}

/**
 * Single-shot RAG: resolve category (auto-classify if absent) → retrieve →
 * build prompt → generate answer → dedupe sources.
 */
export async function answerQuestion(
  question: string,
  category?: Category,
): Promise<AssistantAnswer> {
  const resolved: Category | "unknown" = category ?? (await classifyCategory(question));

  const chunks = await retrieve(question, resolved);
  const context = chunks.map((c) => c.content).join("\n\n");

  const label =
    resolved === "unknown"
      ? "Northeastern international student topics"
      : AVAILABLE_CATEGORIES[resolved];

  const completion = await getOpenAI().chat.completions.create({
    model: ANSWER_MODEL,
    temperature: 0.2,
    messages: [{ role: "user", content: buildPrompt(label, context, question) }],
  });

  return {
    category: resolved,
    categoryName: resolved === "unknown" ? "All categories" : AVAILABLE_CATEGORIES[resolved],
    question,
    answer: completion.choices[0]?.message?.content ?? "",
    sources: dedupeSources(chunks),
  };
}
