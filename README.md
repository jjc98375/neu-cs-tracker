# NEU CS Tracker

Course browser and graduation planner for Northeastern University Computer Science graduate students.

**Live:** [neu-cs-tracker.vercel.app](https://neu-cs-tracker.vercel.app)

## Features

### Course Browser
- Search courses across all terms, subjects, and campuses via the live NEU Banner API
- Filter by term, subject, course number range, campus, and summer session
- View meeting times, instructor info, enrollment stats, and seat availability
- Expandable rows with course descriptions fetched on demand
- Summer session detection (Full, Summer 1, Summer 2) using date-based analysis

### Graduation Planner
- Track progress toward MS Computer Science, MS Artificial Intelligence, or MS Data Science
- Add completed and planned courses with term and grade info
- Visual credit progress bar (completed vs. planned vs. remaining)
- Automatic requirement checking against the official NEU catalog:
  - **MSCS:** Core courses + breadth areas (AI/DS, Systems/SW, Theory/Security) + electives
  - **MSAI:** Core courses (with OR options) + specialization areas (Vision, ML, Robotics, etc.)
  - **MSDS:** Core courses (with OR options) + CS or Engineering concentration
- Same requirements across all campuses (Boston, Seattle, Silicon Valley, etc.)
- Estimated graduation term projection

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **SWR** for client-side data fetching
- **Vitest** for testing (100+ unit and integration tests)
- **Vercel** for deployment

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
# Unit tests (mocked, fast)
npm run test:unit

# Integration tests (requires dev server running)
npm run test:integration

# All tests
npx vitest run
```

## Project Structure

```
src/
  app/
    page.tsx                    # Home page
    courses/page.tsx            # Course browser
    requirements/page.tsx       # Graduation planner
    api/                        # Server-side API routes (proxy to Banner)
      terms/route.ts
      courses/route.ts
      subjects/route.ts
      campuses/route.ts
      course-description/route.ts
  components/
    CourseTable.tsx              # Sortable course table with detail rows
    FilterPanel.tsx              # Search filters sidebar
    RequirementChecker.tsx       # Graduation progress tracker
    SessionBadge.tsx             # Summer session indicator
    ThemeProvider.tsx            # Dark/light mode
  lib/
    banner-api.ts               # Banner API client + summer session detection
    requirements.ts             # Graduation requirements engine
    types.ts                    # TypeScript interfaces
```

## How It Works

All course data comes from [NUBanner](https://nubanner.neu.edu/StudentRegistrationSsb/ssb), Northeastern's Ellucian Banner 9 system. API requests are proxied through Next.js server-side routes to avoid CORS issues. Each search establishes a session cookie with Banner before querying.

Graduation requirements are based on the [2024-2026 NEU Graduate Catalog](https://catalog.northeastern.edu/graduate/computer-information-science/).

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to your fork and open a PR

## License

MIT
