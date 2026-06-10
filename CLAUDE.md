@AGENTS.md

# NEU CS Tracker

Course browser and graduation planner for Northeastern University CS graduate students.
Built with **Next.js 16.2.1**, **React 19**, **TypeScript**, **Tailwind CSS 4**, **SWR**.

## Architecture

```
src/
  app/
    page.tsx                        # Home page
    courses/page.tsx                # Course browser (client component, uses SWR)
    requirements/page.tsx           # Graduation planner (client component)
    layout.tsx                      # Root layout with nav + ThemeProvider
    globals.css                     # Tailwind imports
    api/
      terms/route.ts               # GET /api/terms
      campuses/route.ts            # GET /api/campuses?term=
      subjects/route.ts            # GET /api/subjects?term=
      courses/route.ts             # GET /api/courses?term=&subject=&...
      course-description/route.ts  # GET /api/course-description?crn=&term=
  components/
    CourseTable.tsx                 # Sortable table with expandable detail rows
    FilterPanel.tsx                 # Sidebar filters (term, subject, campus, session, etc.)
    RequirementChecker.tsx          # Graduation progress tracker
    SessionBadge.tsx                # Colored badge for summer session type
    ThemeProvider.tsx               # Dark/light mode context
  lib/
    types.ts                       # All TypeScript interfaces
    banner-api.ts                  # Server-side Banner API client + helpers
    requirements.ts                # Graduation requirements engine (MSCS, MSAI, MSDS)
__tests__/                         # Vitest tests (104 passing)
```

## Banner API Integration

All Banner calls go through Next.js API routes (server-side) to avoid CORS.
Base URL: `https://nubanner.neu.edu/StudentRegistrationSsb/ssb`

**Session flow**: Every search requires a `POST /term/search` first to get session cookies, which are then passed to subsequent GET requests.

**Key function**: `searchCourses()` in `banner-api.ts` — establishes session, queries Banner, then annotates each section with a derived `summerSession` field.

## Summer Session Detection

`deriveSummerSession(termCode, partOfTerm, meetingTimes?)` determines session type:

1. **Term code suffix** (last 2 digits):
   - `40` → Summer 1, `60` → Summer 2, `50` → needs further analysis
   - `10` → Spring, `30` → Fall (both return "N/A")
   - `54`/`55` → CPS summer terms (treated as summer but no split)
2. **For suffix "50"** — `partOfTerm` field:
   - `"A"` → Summer 1, `"B"` → Summer 2, `"1"` or `""` → Full
3. **Date-based fallback** (when partOfTerm is ambiguous): uses meeting time `startDate`/`endDate` ranges:
   - Duration >= 60 days → Full
   - Ends before July → Summer 1
   - Starts late June or later → Summer 2

## Graduation Requirements Engine

`lib/requirements.ts` defines three programs:
- **MSCS** (32 credits): Breadth requirements (Systems, Theory, AI, SE groups), capstone
- **MSAI** (32 credits): 3 required + 5 electives from a pool
- **MSDS** (32 credits): 4 required core + analytics/computation depth + electives

`analyzeGraduation(programId, completed, planned)` returns credit totals, requirement statuses, missing courses, on-track boolean, and projected graduation term.

## Assistant (RAG chatbot)

International-student Q&A feature at `/assistant`, powered by Retrieval-Augmented Generation over Northeastern OGS PDFs. Ported from a former Python/Streamlit app into this Next.js app (single Vercel deployment). **Live: neu-cs-tracker.vercel.app/assistant.**

**Flow (single-shot, stateless):** `POST /api/assistant {question, category?}` → auto-classify the question into one of 8 categories via `gpt-4o-mini` (or use an explicit category; `unknown` → no filter) → embed with `text-embedding-3-small` → category-filtered Qdrant similarity search (k=6) → stuff context into a category-aware prompt → `gpt-4o-mini` answer → return `{category, categoryName, question, answer, sources[], viaWeb?}`.

**Live web fallback:** when the corpus can't answer, `answerQuestion` falls back to a domain-restricted live web search (OpenAI Responses `web_search` tool, `filters.allowed_domains: ["northeastern.edu"]`, model **`gpt-5-mini`** — the *-mini chat models reject `filters`). Two triggers: (1) the top retrieved chunk scores below `WEB_FALLBACK_FLOOR` (0.5 cosine — no relevant doc), or (2) the answer model returns `{"answered": false}` (a doc was on-topic but didn't contain the figure/policy — `buildPrompt` now asks for that JSON). Web answers come back with `categoryName: "Live web · northeastern.edu"`, `viaWeb: true`, and URL-citation sources (`metadata.source: "web"`); ChatMessage renders those previews as clickable links. Failures degrade gracefully to the corpus answer.

**Files:**
- `src/lib/rag-categories.ts` — 8 category keys/labels (MUST match `ingestion/ingest.py`), `Category` type, `isCategory()`.
- `src/lib/rag-clients.ts` — lazy `getOpenAI()`/`getQdrant()` singletons + `COLLECTION`; fail-fast on missing env.
- `src/lib/rag.ts` — `classifyCategory`, `retrieve`, `buildPrompt`, `dedupeSources`, `answerQuestion`.
- `src/app/api/assistant/route.ts` — POST handler (zod validation, 400/502).
- `src/components/ChatMessage.tsx`, `src/app/assistant/page.tsx` — chat UI; nav link in `layout.tsx`.
- `ingestion/` — offline Python pipeline (`ingest.py` + `northeastern_docs/` PDFs), `.vercelignore`'d. Tests: `__tests__/lib/rag*.test.ts`, `__tests__/api/assistant.test.ts`, `__tests__/components/ChatMessage.test.tsx`, opt-in `__tests__/integration/assistant.integration.test.ts` (gated by `RUN_RAG_INTEGRATION=1`).

**Env vars** (`OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION=northeastern_docs`): set in Vercel project settings (Production/Preview/Dev) AND locally — `.env.local` (app) and `ingestion/.env` (ingestion) already exist on the dev machine, both gitignored. See `.env.example`.

**Data:** Qdrant Cloud collection `northeastern_docs` (~439 points, 46 source PDFs as of 2026-06-05). To (re)build it: `cd ingestion && python ingest.py` using `ingestion/.venv` (the venv's `.venv/bin/python` is the working interpreter — a miniconda `python` shadows it after `activate`, so call the absolute path).

**Two gotchas already fixed in `ingest.py` (don't regress):**
1. langchain 1.x: import `RecursiveCharacterTextSplitter` from `langchain_text_splitters` (not `langchain.text_splitter`).
2. Qdrant rejects filtered search unless the field has a payload index — `ingest.py` creates a keyword index on `metadata.category` after upload. The runtime filter key is `metadata.category` (LangChain stores payloads as `{page_content, metadata:{category, filename, ...}}`).

Design spec + implementation plan: `docs/superpowers/specs/2026-06-04-rag-chatbot-integration-design.md`, `docs/superpowers/plans/2026-06-04-rag-chatbot-integration.md`.

**Corpus maintenance (last refreshed 2026-06-05):** PDFs are headless-Chrome printouts of live OGS / Student Financial Services pages. Re-capture with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf="out.pdf" <URL>` then re-run ingest. The 2026-06-05 pass added OPT, STEM OPT, NUSHP enrollment + waiver, and Global Co-op docs, and refreshed 6 stale pages (F-1 visa process — old URL had 404'd and moved to `/ogs/new-students/f-1-visa-process/`; J-1 visa; CPT; arriving-in-US; orientation; fee descriptions). Watch for time-sensitive content that dates the corpus: SEVIS I-901 fee (currently F-1 $350 / J-1 $220), tuition/fee academic year, OGS "Travel Recommendations" year, and USCIS/consular policy-update banners.

## Testing

```bash
npx vitest run          # Run all 104 tests
npx vitest run --watch  # Watch mode
```

Tests cover: banner-api helpers, requirements engine, SessionBadge component, all API routes.

## Development

```bash
npm run dev             # Start dev server
npm run build           # Production build
npm run lint            # ESLint
```

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.mts).

## Important Notes

- Client components use `"use client"` directive (courses page, requirements page, all components)
- SWR handles client-side data fetching with caching in the courses page
- Dark mode is supported via ThemeProvider with localStorage persistence
- Banner API responses include `meetingsFaculty` array with `meetingTime` objects containing schedule, dates, and location
- The `partOfTerm` field from Banner is not always reliable for summer session detection — the date-based fallback in `deriveSummerSession` handles cases where Banner returns ambiguous values

## Agents

### api-tester
Run with: dispatch the `api-tester` agent (or use Agent tool with `.claude/agents/api-tester.md`).
Requires: dev server running (`npm run dev`).
Tests: `__tests__/integration/` — live HTTP tests against Banner API routes.
Use when: courses don't load after term switch, summer session labels are wrong, or API returns empty/stale data.
