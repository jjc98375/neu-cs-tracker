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
